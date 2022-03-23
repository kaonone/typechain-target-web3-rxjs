import BN, { isBN } from 'bn.js';
import { RawAbiParameter, RawEventAbiDefinition, RawEventArgAbiDefinition } from 'typechain';
import {
  Filter,
  EventOptions as Web3EventOptions,
  EventData as Web3EventData,
} from 'web3-eth-contract';

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
  EventLog,
  SubscribeEventOptions,
} from './types';
import { attachStaticFields, extractEventInputs } from './utils';

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

export function eventOptionsToRequest(eventOptions: SubscribeEventOptions<any>): Web3EventOptions {
  if (!eventOptions.filter) {
    return eventOptions;
  }
  const toEventFilter = (value: any) => (isBN(value) ? value.toString() : value);

  const filter = Object.fromEntries(
    Object.entries(eventOptions.filter).map(([inputName, value]) => [
      inputName,
      Array.isArray(value) ? value.map(toEventFilter) : toEventFilter(value),
    ]),
  ) as Filter;

  return { ...eventOptions, filter };
}

export function eventToOutput(
  abi: RawEventAbiDefinition[],
  eventData: Web3EventData,
): EventLog<any> {
  const isAnonymous = !eventData.event || !eventData.signature;
  if (isAnonymous) {
    console.warn(new Error('Impossible to convert an anonymous event'));
    return eventData;
  }
  const inputsAbi = extractEventInputs(abi, eventData);
  if (!inputsAbi) {
    console.warn(new Error(`Event ${eventData.event} not found`));
    return eventData;
  }

  const returnValues = inputsAbi.reduce((resultAcc, inputAbi, index) => {
    const convertedValue = inputAbi.indexed
      ? convertEventIndexedInputToOutput(inputAbi, eventData.returnValues[index])
      : convertResponseValueToOutput(inputAbi, eventData.returnValues[index]);

    resultAcc.push(convertedValue);
    if (inputAbi.name) {
      attachStaticFields(resultAcc, { [inputAbi.name]: convertedValue });
    }
    return resultAcc;
  }, [] as Response[]);

  return { ...eventData, returnValues };
}

function convertEventIndexedInputToOutput(
  abiParameter: RawEventArgAbiDefinition,
  value: Web3ContractResponse,
) {
  const { type, isArray } = parseEvmType(abiParameter.type);
  return type === 'tuple' || isArray ? value : convertPlainResponseToOutput(type, value);
}
