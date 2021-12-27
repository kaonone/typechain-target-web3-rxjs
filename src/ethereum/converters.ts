import BN from 'bn.js';
import { RawAbiParameter } from 'typechain';

import {
  JSType,
  EvmType,
  Arguments,
  Response,
  InputEvmTypeToJSTypeMap,
  OutputEvmTypeToJSTypeMap,
  Web3ContractInputArgs,
  Web3ContractResponse,
  ArgumentType,
  isPlainValue,
} from './types';
import { attachStaticFields } from './utils';

export function inputsToRequest(
  inputsAbi: RawAbiParameter[],
  args: Arguments,
): Web3ContractInputArgs {
  return inputsAbi.map((abiParameter, index) => {
    const { isArray, type } = parseEvmType(abiParameter.type);
    const arg = (abiParameter.name && args[abiParameter.name]) || args[index];
    if (!arg) {
      throw new Error(`ABI parameter ${abiParameter.name} not found in ${args}`);
    }

    if (isArray) {
      if (!Array.isArray(arg)) {
        throw new Error(`Expected an array, but received ${arg}`);
      }
      return arg.map(innerArgs =>
        type === 'tuple'
          ? convertTupleValueToRequest(abiParameter, innerArgs)
          : convertPlainValueToRequest(type, innerArgs),
      );
    }

    return type === 'tuple'
      ? convertTupleValueToRequest(abiParameter, arg)
      : convertPlainValueToRequest(type, arg);
  });
}

function convertTupleValueToRequest(abiParameter: RawAbiParameter, args: ArgumentType) {
  if (!abiParameter.components || isPlainValue(args)) {
    throw new Error(`Unable to convert ${args} to a tuple request`);
  }
  return inputsToRequest(abiParameter.components, args as Arguments);
}

function convertPlainValueToRequest(type: EvmType, inputValue: ArgumentType): JSType {
  if (!isPlainValue(inputValue)) {
    throw new Error(`Expected string, boolean, or BN, but received ${inputValue}`);
  }

  const toRequest: {
    [key in EvmType]: (input: InputEvmTypeToJSTypeMap[key]) => JSType;
  } = {
    address: value => value,
    boolean: value => value,
    integer: value => value.toString(),
    uinteger: value => value.toString(),
    string: value => value,
    bytes: value => value,
    'dynamic-bytes': value => value,
  };

  return (toRequest[type] as any)(inputValue);
}

export function responseToOutput(
  outputsAbi: RawAbiParameter[],
  response: Web3ContractResponse,
): Response {
  if (outputsAbi.length === 1) {
    return convertResponseValueToOutput(outputsAbi[0], response);
  }

  return toMixedArray(outputsAbi, response);
}

function convertResponseValueToOutput(
  abiParameter: RawAbiParameter,
  responseValue: Web3ContractResponse,
): Response {
  const { type, isArray } = parseEvmType(abiParameter.type);

  if (isArray) {
    if (!Array.isArray(responseValue)) {
      throw new Error(`Expected an array, but received ${responseValue}`);
    }

    return responseValue.map(innerValues =>
      type === 'tuple'
        ? convertTupleResponseToOutput(abiParameter, innerValues)
        : convertPlainResponseToOutput(type, innerValues),
    );
  }
  return type === 'tuple'
    ? convertTupleResponseToOutput(abiParameter, responseValue)
    : convertPlainResponseToOutput(type, responseValue);
}

function convertTupleResponseToOutput(
  abiParameter: RawAbiParameter,
  responseValue: Web3ContractResponse,
) {
  if (!abiParameter.components) {
    throw new Error(`Components property is required for tuples`);
  }
  return toMixedArray(abiParameter.components, responseValue);
}

function toMixedArray(abiParameters: RawAbiParameter[], value: Web3ContractResponse) {
  if (isPlainValue(value)) {
    throw new Error(`Expected an object, or an array, but received ${value}`);
  }
  return abiParameters.reduce((resultAcc, componentAbi, index) => {
    const convertedValue = convertResponseValueToOutput(componentAbi, value[index]);
    resultAcc.push(convertedValue);
    if (componentAbi.name) {
      attachStaticFields(resultAcc, { [componentAbi.name]: convertedValue });
    }
    return resultAcc;
  }, [] as Response[]);
}

function convertPlainResponseToOutput(type: EvmType, value: Web3ContractResponse): JSType {
  if (!isPlainValue(value)) {
    throw new Error(`Expected string, boolean, or BN, but received ${value}`);
  }

  const toOutput: {
    [key in EvmType]: (typedValue: OutputEvmTypeToJSTypeMap[key]) => JSType;
  } = {
    address: v => v,
    boolean: v => v,
    integer: v => new BN(v),
    uinteger: v => new BN(v),
    string: v => v,
    bytes: v => v,
    'dynamic-bytes': v => v,
  };

  return (toOutput[type] as any)(value);
}

function parseEvmType(abiType: string): { type: EvmType | 'tuple'; isArray: boolean } {
  const [, inputType, isArray] = abiType.match(/^(.+?)(\[\d*?\])?$/) || [];

  const type = ((): EvmType | 'tuple' => {
    // eslint-disable-next-line default-case
    switch (inputType) {
      case 'bool':
        return 'boolean';
      case 'address':
        return 'address';
      case 'string':
        return 'string';
      case 'byte':
        return 'bytes';
      case 'bytes':
        return 'dynamic-bytes';
    }

    if (inputType.startsWith('tuple')) {
      return 'tuple';
    }
    if (inputType.startsWith('uint')) {
      return 'uinteger';
    }
    if (inputType.startsWith('int')) {
      return 'integer';
    }
    if (inputType.startsWith('bytes')) {
      return 'bytes';
    }

    throw new Error(`Type "${abiType}" cannot be parsed`);
  })();

  return { type, isArray: !!isArray };
}
