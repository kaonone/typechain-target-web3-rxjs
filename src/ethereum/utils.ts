import { RawAbiDefinition, RawAbiParameter } from 'typechain';

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

  const entry = methodEntries.find(m => getWeb3Signature(m) === method);

  if (!entry) {
    console.warn(new Error(`Method ${method} not found`));
    return null;
  }

  return entry;
}

function getWeb3Signature(abi: Pick<RawAbiDefinition, 'name' | 'inputs'>): string {
  return `${abi.name}(${abi.inputs.map(i => getArgumentForSignature(i)).join(',')})`;
}

function getArgumentForSignature(argument: RawAbiParameter): string {
  if (argument.type === 'tuple') {
    return `(${argument.components?.map(i => getArgumentForSignature(i)).join(',')})`;
  }
  if (argument.type === 'tuple[]') {
    return `${getArgumentForSignature({ ...argument, type: 'tuple' })}[]`;
  }
  return argument.type;
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
