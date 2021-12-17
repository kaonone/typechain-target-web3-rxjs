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
} from './types';
import { attachStaticFields } from './utils';

export function inputsToRequest(
  inputsAbi: RawAbiParameter[],
  args: Arguments,
): Web3ContractInputArgs {
  if (inputsAbi.length === 0 && args) {
    throw new Error(`Received arguments ${args} for empty ABI declaration`);
  }

  return inputsAbi.map(parameterAbi => {
    const { isArray, type } = parseEvmType(parameterAbi.type);
    const arg = args[parameterAbi.name];
    if (!arg) {
      throw new Error(`ABI parameter ${parameterAbi.name} not found in ${args}`);
    }
    if (type === 'tuple') {
      return isArray
        ? (arg as Arguments[]).map(innerArgs =>
            inputsToRequest(parameterAbi.components || [], innerArgs),
          )
        : inputsToRequest(parameterAbi.components || [], arg as Arguments);
    }

    return isArray
      ? (arg as JSType[]).map(innerArgs => convertInputValueToRequest(type, innerArgs))
      : convertInputValueToRequest(type, arg as JSType);
  });
}

function convertInputValueToRequest(type: EvmType, inputValue: JSType): JSType {
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
  if (outputsAbi.length === 0 && response) {
    throw new Error(`Received response ${response} for empty ABI declaration`);
  }
  const responseArray = Array.isArray(response) ? response : [response];

  const result = outputsAbi.reduce((acc, parameterAbi, index) => {
    const { isArray, type } = parseEvmType(parameterAbi.type);
    const responseItem = responseArray[index];

    if (!responseItem) {
      throw new Error(`ABI parameter ${parameterAbi.name} not found in ${response}`);
    }

    let output;
    if (type === 'tuple') {
      output = isArray
        ? (responseItem as JSType[]).map(innerValues =>
            responseToOutput(parameterAbi.components || [], innerValues),
          )
        : responseToOutput(parameterAbi.components || [], responseItem);
    } else {
      output = isArray
        ? (responseItem as JSType[]).map(innerValues =>
            convertResponseValueToOutput(type, innerValues),
          )
        : convertResponseValueToOutput(type, responseItem as JSType);
    }

    return attachStaticFields([...acc, output], {
      [parameterAbi.name]: output,
    });
  }, [] as Response[]);

  return result.length === 1 ? result[0] : result;
}

function convertResponseValueToOutput(type: EvmType, responseValue: JSType): JSType {
  const toOutput: {
    [key in EvmType]: (response: OutputEvmTypeToJSTypeMap[key]) => JSType;
  } = {
    address: value => value,
    boolean: value => value,
    integer: value => new BN(value),
    uinteger: value => new BN(value),
    string: value => value,
    bytes: value => value,
    'dynamic-bytes': value => value,
  };

  return (toOutput[type] as any)(responseValue);
}

function parseEvmType(abiType: string): { type: EvmType | 'tuple'; isArray: boolean } {
  const [, inputType, isArray] = abiType.match(/^(.+?)(\[\])?$/) || [];

  const type = ((): EvmType | 'tuple' => {
    // eslint-disable-next-line default-case
    switch (abiType) {
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
