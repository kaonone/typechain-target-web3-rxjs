import BN, { isBN } from 'bn.js';

export type JSType = string | BN | boolean;
export function isPlainValue<T>(value: T): value is Extract<T, JSType> {
  return typeof value === 'string' || typeof value === 'boolean' || isBN(value);
}

export type EvmType =
  | 'address'
  | 'integer'
  | 'uinteger'
  | 'boolean'
  | 'string'
  | 'bytes'
  | 'dynamic-bytes';

type EvmToJSTypeMap<T extends Record<EvmType, JSType>> = Pick<T, EvmType>;

export type InputEvmTypeToJSTypeMap = EvmToJSTypeMap<{
  address: string;
  integer: BN;
  uinteger: BN;
  boolean: boolean;
  string: string;
  bytes: string;
  'dynamic-bytes': string;
}>;

export type OutputEvmTypeToJSTypeMap = EvmToJSTypeMap<{
  address: string;
  integer: string;
  uinteger: string;
  boolean: boolean;
  string: string;
  bytes: string;
  'dynamic-bytes': string;
}>;

export type Arguments = Record<string, ArgumentType>;
export type ArgumentType = JSType | ArgumentType[] | { [key in string | number]: ArgumentType };

export type Response = JSType | Response[] | { [key in string | number]: Response };

export type Web3ContractInputArgs = Array<JSType | Web3ContractInputArgs>;
export type Web3ContractResponse =
  | Exclude<JSType, BN>
  | Web3ContractResponse[]
  | { [key in string | number]: Web3ContractResponse };
