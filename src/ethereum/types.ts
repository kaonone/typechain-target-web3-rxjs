import { EventLog as Web3EventLog, TransactionReceipt } from 'web3-core';
import BN from 'bn.js';

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

export interface Tx {
  nonce?: string | number;
  chainId?: string | number;
  from?: string;
  to?: string;
  data?: string;
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
