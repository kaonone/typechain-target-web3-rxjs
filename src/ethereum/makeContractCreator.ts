import { Observable } from 'rxjs';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { RawAbiDefinition, RawAbiParameter } from 'typechain';

import { getContractData$ } from './getContractData$';
import {
  EventEmitter,
  SendOptions,
  CallOptions,
  InputEvmType,
  InputEvmTypeToJSTypeMap,
  JSType,
  ContractWrapper,
  Web3ContractInputArgs,
  CallMethod,
  ReadMethod,
  SendMethod,
  Arguments,
  PlainArgumentType,
} from './types';
import { getWeb3Signature } from './utils';

const toRequest: {
  [key in InputEvmType]: (input: InputEvmTypeToJSTypeMap[key]) => JSType;
} = {
  address: value => value,
  boolean: value => value,
  integer: value => value.toString(),
  uinteger: value => value.toString(),
  string: value => value,
  bytes: value => value,
  'dynamic-bytes': value => value,
};

export function makeContractCreator<C extends ContractWrapper>(abi: any[]) {
  return (web3: Web3, address: string): C => {
    const baseContract = new web3.eth.Contract(abi, address);

    const methodsProxy = new Proxy<Contract['methods']>(
      {},
      {
        get(target: Contract['methods'], prop: string) {
          const methodAbi = extractAbiMethod(abi, prop);

          if (!methodAbi) {
            return target[prop];
          }

          const baseCallFunction = (
            input: void | Arguments,
            eventsForReload?: EventEmitter<any> | EventEmitter<any>[],
            tx?: CallOptions,
          ) => {
            return getContractData$(baseContract, web3.eth, prop, {
              tx,
              args: input ? inputsToRequest(methodAbi.inputs, input) : [],
              eventsForReload,
              // convert: (result) => responseToOutput(methodAbi.outputs, result),
            }) as Observable<any>;
          };

          const callFunction: CallMethod<any, any> = baseCallFunction;

          const readFunction: ReadMethod<any, any> = (
            input: void | Arguments,
            tx: SendOptions,
            eventsForReload?: EventEmitter<any> | EventEmitter<any>[],
          ) => baseCallFunction(input, eventsForReload, tx);

          if (methodAbi.stateMutability === 'view') {
            return callFunction;
          }

          const getTransactionFunction = (input: void | Arguments) => {
            const args = input ? inputsToRequest(methodAbi.inputs, input) : [];
            return baseContract.methods[prop](...args);
          };

          const sendFunction: SendMethod<any, any> = attachStaticFields(
            (input: void | Arguments, tx: SendOptions) => {
              return getTransactionFunction(input).send(tx);
            },
            {
              getTransaction: getTransactionFunction,
              read: readFunction,
            },
          );

          return sendFunction;
        },
      },
    );

    return (new Proxy<Contract>(baseContract, {
      get(target, prop: keyof Contract) {
        if (prop === 'methods') {
          return methodsProxy;
        }
        return target[prop];
      },
    }) as unknown) as C;
  };
}

export function inputsToRequest(
  inputsAbi: RawAbiParameter[],
  args: Arguments,
): Web3ContractInputArgs {
  return inputsAbi.map(parameterAbi => {
    const { isArray, type } = parseEvmType(parameterAbi.type);

    if (type === 'tuple') {
      return isArray
        ? (args[parameterAbi.name] as PlainArgumentType[]).map(innerArgs =>
            inputsToRequest(parameterAbi.components || [], innerArgs as Arguments),
          )
        : inputsToRequest(parameterAbi.components || [], args[parameterAbi.name] as Arguments);
    }

    return isArray
      ? (args[parameterAbi.name] as PlainArgumentType[]).map(innerArgs =>
          convertInputValueToRequest(type, innerArgs as JSType),
        )
      : convertInputValueToRequest(type, args[parameterAbi.name] as JSType);
  });
}

function convertInputValueToRequest(type: InputEvmType, inputValue: JSType): JSType {
  return (toRequest[type] as any)(inputValue);
}

function parseEvmType(abiType: string): { type: InputEvmType | 'tuple'; isArray: boolean } {
  const [, inputType, isArray] = abiType.match(/^(.+?)(\[\])?$/) || [];

  const type = ((): InputEvmType | 'tuple' => {
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

export function attachStaticFields<T extends {}, I extends Record<string, any>>(
  target: T,
  staticFields: I,
): T & I {
  const result: T & I = target as T & I;

  Object.keys(staticFields).forEach((key: keyof I) => {
    (result as I)[key] = staticFields[key];
  });

  return result;
}

function extractAbiMethod(abi: RawAbiDefinition[], method: string): RawAbiDefinition | null {
  const [, methodName] = method.match(/(\w+?)($|\(.*)/) || [];

  if (!methodName) {
    console.warn(new Error(`Invalid method: ${method}`));
    return null;
  }

  const methodEntries = abi.filter(m => m.name === methodName && m.type === 'function');

  if (!methodEntries.length) {
    console.warn(new Error(`Method ${method} not found`));
    return null;
  }

  const isSimpleMethodName = method === methodName;
  if (isSimpleMethodName) {
    return methodEntries[0];
  }

  const entry = methodEntries.find(m => getWeb3Signature(m) === method);

  if (!entry) {
    console.warn(new Error(`Method ${method} not found`));
    return null;
  }

  return entry;
}
