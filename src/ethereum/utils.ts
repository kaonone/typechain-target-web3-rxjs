import { RawAbiDefinition, RawAbiParameter } from 'typechain';

export function getWeb3Signature(abi: Pick<RawAbiDefinition, 'name' | 'inputs'>): string {
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
