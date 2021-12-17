import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import { getContractData$ } from './getContractData$';
import {
  EventEmitter,
  SendOptions,
  CallOptions,
  ContractWrapper,
  CallMethod,
  ReadMethod,
  SendMethod,
  Arguments,
} from './types';
import { attachStaticFields, extractAbiMethod } from './utils';
import { inputsToRequest, responseToOutput } from './converters';

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
              convert: result => (result ? responseToOutput(methodAbi.outputs, result) : undefined),
            });
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
            (input: void | Arguments, tx: SendOptions) => getTransactionFunction(input).send(tx),
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
