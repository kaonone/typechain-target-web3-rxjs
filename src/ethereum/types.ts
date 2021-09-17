import {
  EventLog as Web3EventLog,
  TransactionReceipt,
  PromiEvent,
  TransactionConfig,
} from 'web3-core';
import BN from 'bn.js';
import { O } from 'ts-toolbelt';

export interface TransactionObject {
  arguments: any[];
  call(tx?: CallOptions): Promise<TransactionReceipt>;
  send: {
    (tx?: SendOptions): PromiEvent<TransactionReceipt>;
    request(
      options: Omit<SendOptions, 'to' | 'data'>,
    ): { params: [TransactionConfig]; method: string };
  };
  estimateGas(tx?: SendOptions): Promise<number>;
  encodeABI(): string;
}

export type EventLog<T> = Omit<Web3EventLog, 'returnValues'> & { returnValues: T };

export interface EventEmitter<T> {
  on(type: 'data', handler: (event: EventLog<T>) => void): EventEmitter<T>;
  on(type: 'changed', handler: (receipt: EventLog<T>) => void): EventEmitter<T>;
  on(type: 'error', handler: (error: Error) => void): EventEmitter<T>;
  on(
    type: 'error' | 'data' | 'changed',
    handler: (error: Error | TransactionReceipt | string) => void,
  ): EventEmitter<T>;
}

export type SendOptions = O.Required<CallOptions, 'from'>;

export interface CallOptions {
  nonce?: string | number;
  chainId?: string | number;
  from?: string;
  value?: string | number;
  gas?: string | number;
  gasPrice?: string | number;
  maxPriorityFeePerGas?: string | number;
  maxFeePerGas?: string | number;
}

export type InputEvmTypeToJSTypeMap = {
  address: string;
  integer: BN;
  uinteger: BN;
  boolean: boolean;
  string: string;
  bytes: string;
  'dynamic-bytes': string;
};

export type InputEvmType = keyof InputEvmTypeToJSTypeMap;

export type JSType = InputEvmTypeToJSTypeMap[InputEvmType];
