import {
  EventLog as Web3EventLog,
  TransactionReceipt,
  PromiEvent,
  TransactionConfig,
} from 'web3-core';
import { O } from 'ts-toolbelt';
import { Observable } from 'rxjs';
import { Contract } from 'web3-eth-contract';

import { Arguments, Response } from './core';

export interface ContractWrapper extends Omit<Contract, 'methods' | 'events' | 'getPastEvents'> {
  methods: Record<string, CallMethod<any, any> | SendMethod<any, any>>;
  events: Record<string, EventMethod<any, any>> & {
    allEvents: EventMethod<any, any>;
  };
  getPastEvents: PastEventsMethod<any, any> | void;
}

export type CallMethod<Input extends Arguments | void, Output extends Response | void> = (
  input: Input,
  eventsForReload?: EventEmitter<any> | EventEmitter<any>[],
  tx?: CallOptions,
) => Observable<Output>;

export type SendMethod<Input extends Arguments | void, Output extends Response | void> = ((
  input: Input,
  tx: SendOptions,
) => PromiEvent<TransactionReceipt>) & {
  getTransaction(input: Input): TransactionObject;
  read: ReadMethod<Input, Output>;
};

export type ReadMethod<Input extends Arguments | void, Output extends Response | void> = (
  input: Input,
  tx: SendOptions,
  eventsForReload?: EventEmitter<any> | EventEmitter<any>[],
) => Observable<Output>;

export type EventMethod<Input extends Arguments | void, IndexedInput extends Arguments | void> = (
  options?: SubscribeEventOptions<IndexedInput>,
  cb?: Callback<EventLog<Input>>,
) => EventEmitter<Input>;

export type PastEventsMethod<
  Inputs extends Record<string, Arguments | void>,
  IndexedInputs extends Record<keyof Inputs, Arguments | void>
> = {
  <EventName extends keyof Inputs>(event: EventName): Promise<EventLog<Inputs[EventName]>[]>;
  <EventName extends keyof Inputs>(
    event: EventName,
    options: PastEventsOptions<IndexedInputs[EventName]>,
    callback: (error: Error, event: EventLog<Inputs[EventName]>) => void,
  ): Promise<EventLog<Inputs[EventName]>[]>;
  <EventName extends keyof Inputs>(
    event: EventName,
    options: PastEventsOptions<IndexedInputs[EventName]>,
  ): Promise<EventLog<Inputs[EventName]>[]>;
  <EventName extends keyof Inputs>(
    event: EventName,
    callback: (error: Error, event: EventLog<Inputs[EventName]>) => void,
  ): Promise<EventLog<Inputs[EventName]>[]>;
};

type PastEventsOptions<IndexedInput extends Arguments | void> = SubscribeEventOptions<
  IndexedInput
> & {
  toBlock?: BlockType;
};

interface SubscribeEventOptions<IndexedInput extends Arguments | void> {
  filter?: Partial<IndexedInput>;
  fromBlock?: BlockType;
  topics?: string[];
}

type BlockType = 'latest' | 'pending' | 'genesis' | number;
type Callback<T> = (error: Error, result: T) => void;

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
