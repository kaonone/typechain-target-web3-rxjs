import BN from 'bn.js';

export type JSType = string | BN | boolean;
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
export type ArgumentType = JSType | ArgumentType[] | { [key in string]: ArgumentType };

export type Response = JSType | Response[] | { [key in string | number]: Response };

export type Web3ContractInputArgs = Array<JSType | Web3ContractInputArgs>;
export type Web3ContractResponse = JSType | Array<Web3ContractResponse>;
