import { RawAbiDefinition, RawEventAbiDefinition, RawEventArgAbiDefinition } from 'typechain';
// @ts-ignore
import { _jsonInterfaceMethodToString, AbiItem } from 'web3-utils';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import { EventData as Web3EventData } from 'web3-eth-contract';

export function extractAbiMethod(abi: RawAbiDefinition[], method: string): RawAbiDefinition | null {
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

  const entry = methodEntries.find(m => _jsonInterfaceMethodToString(m as AbiItem) === method);

  if (!entry) {
    console.warn(new Error(`Method ${method} not found`));
    return null;
  }

  return entry;
}

export function extractEventInputs(
  abi: RawEventAbiDefinition[],
  eventLog: Web3EventData,
): RawEventArgAbiDefinition[] | null {
  const eventEntries = abi.filter(
    e => e.name === eventLog.event && e.type === 'event' && !e.anonymous,
  );

  if (eventEntries.length === 1) {
    return eventEntries[0].inputs;
  }

  const entry = eventEntries.find(e => {
    const signature = ((abiCoder as unknown) as AbiCoder).encodeEventSignature(e);
    return signature === eventLog.signature;
  });

  return entry?.inputs || null;
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
