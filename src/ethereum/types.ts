import {
  EventLog as Web3EventLog,
  TransactionReceipt,
  PromiEvent,
  TransactionConfig,
} from 'web3-core';
import { O } from 'ts-toolbelt';
import { Observable } from 'rxjs';
import { Contract } from 'web3-eth-contract';
import BN from 'bn.js';

export interface ContractWrapper extends Omit<Contract, 'methods' | 'events' | 'getPastEvents'> {
  methods: Record<string, CallMethod<any, any> | SendMethod<any, any>>;
  events: Record<string, EventMethod<any, any>> & {
    allEvents: EventMethod<any, any>;
  };
  getPastEvents: PastEventsMethod<any, any>;
}

export type CallMethod<Input extends Arguments | void, Output extends void | ArgumentType> = (
  input: Input,
  eventsForReload?: EventEmitter<any> | EventEmitter<any>[],
  tx?: CallOptions,
) => Observable<Output>;

export type SendMethod<Input extends Arguments | void, Output extends void | ArgumentType> = ((
  input: Input,
  tx: SendOptions,
) => PromiEvent<TransactionReceipt>) & {
  getTransaction(input: Input): TransactionObject;
  read: ReadMethod<Input, Output>;
};

export type ReadMethod<Input extends Arguments | void, Output extends void | ArgumentType> = (
  input: Input,
  tx: SendOptions,
  eventsForReload?: EventEmitter<any> | EventEmitter<any>[],
) => Observable<Output>;

type EventMethod<Input extends Arguments, IndexedInput extends Arguments> = (
  options?: SubscribeEventOptions<IndexedInput>,
  cb?: Callback<EventLog<Input>>,
) => EventEmitter<Input>;

type PastEventsMethod<
  Inputs extends Record<string, Arguments>,
  IndexedInputs extends Record<keyof Inputs, Arguments>
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

type PastEventsOptions<IndexedInput extends Arguments> = SubscribeEventOptions<IndexedInput> & {
  toBlock?: BlockType;
};

interface SubscribeEventOptions<IndexedInput extends Arguments> {
  filter?: Partial<IndexedInput>;
  fromBlock?: BlockType;
  topics?: string[];
}

export type Arguments = Record<string, ArgumentType>;
export type ArgumentType = PlainArgumentType | PlainArgumentType[];
export type PlainArgumentType = JSType | { [key in string]: PlainArgumentType };

type BlockType = 'latest' | 'pending' | 'genesis' | number;
type Callback<T> = (error: Error, result: T) => void;

/* ** EXAMPLE START ** */

interface X extends ContractWrapper {
  methods: {
    testCall: CallMethod<void, void>;
    testCall1: CallMethod<{ amount: BN }, string>;
    testCall2: CallMethod<void, [string, BN]>;
    testSend: SendMethod<void, void>;
    testSend1: SendMethod<{ amount: BN }, string>;
    testSend2: SendMethod<void, [string, BN]>;
  };
  events: {
    TestEvent: EventMethod<EventInput, EventIndexedInput>;
    TestEvent1: EventMethod<Event1Input, Event1IndexedInput>;
    TestEvent2: EventMethod<Event2Input, Event2IndexedInput>;
    allEvents: EventMethod<
      EventInput | Event1Input | Event2Input,
      EventIndexedInput | EventIndexedInput | EventIndexedInput
    >;
  };
  getPastEvents: PastEventsMethod<
    {
      TestEvent: EventInput;
      TestEvent1: Event1Input;
      TestEvent2: Event2Input;
    },
    {
      TestEvent: EventIndexedInput;
      TestEvent1: Event1IndexedInput;
      TestEvent2: Event2IndexedInput;
    }
  >;
}

type EventInput = {
  amount: BN;
  user: string;
};
type EventIndexedInput = {
  user: string;
};
type Event1Input = {
  total: BN;
  user: string;
};
type Event1IndexedInput = {
  user: string;
};
type Event2Input = {
  user: string;
  amount: BN;
};
type Event2IndexedInput = {
  amount: BN;
};

const x: X = null as any;

const a = x.methods.testCall();
const b = x.methods.testCall1({ amount: new BN(0) });
const c = x.methods.testCall2(undefined, x.events.TestEvent({ filter: { user: '0x00' } }));

const a1 = x.methods.testSend(undefined, { from: '0x00' });
const b1 = x.methods.testSend1({ amount: new BN(0) }, { from: '0x00' });
const c1 = x.methods.testSend2(undefined, { from: '0x00' });

const a2 = x.methods.testSend.getTransaction();
const b2 = x.methods.testSend1.getTransaction({ amount: new BN(0) });
const c2 = x.methods.testSend2.getTransaction();

const a3 = x.methods.testSend.read(undefined, { from: '0x00' });
const b3 = x.methods.testSend1.read({ amount: new BN(0) }, { from: '0x00' });
const c3 = x.methods.testSend2.read(
  undefined,
  { from: '0x00' },
  x.events.TestEvent({ filter: { user: '0x00' } }),
);

const d = x.events.TestEvent2({ filter: { amount: new BN(0) } });
const e = x.events.allEvents({ filter: { user: '0x00' } });

const f = x.getPastEvents('TestEvent', {
  filter: { user: '0x00' },
  fromBlock: 123,
  toBlock: 'latest',
});

/* ** EXAMPLE END ** */

export interface Web3ContractInputArgs extends Array<JSType | Web3ContractInputArgs> {}
export type Web3ContractOutputArgs = JSType | Web3ContractInputArgs;

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
