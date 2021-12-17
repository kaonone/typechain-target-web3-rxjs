import { Contract, FunctionDeclaration, getSignatureForFn } from 'typechain';

import { codegenInputTypes, codegenOutputTypes } from './types';

export function codegenMethods(functions: Contract['functions']): string {
  return Object.values(functions)
    .map(fns => {
      if (fns.length === 1) {
        return codegenForSingleFunction(fns[0]);
      }
      return codegenForOverloadedFunctions(fns);
    })
    .join('\n');
}

function codegenForOverloadedFunctions(fns: FunctionDeclaration[]): string {
  return [
    codegenForSingleFunction(fns[0]),
    ...fns.map(f => codegenForSingleFunction(f, `'${getSignatureForFn(f)}'`)),
  ].join('\n');
}

function codegenForSingleFunction(fn: FunctionDeclaration, overloadedName?: string): string {
  const methodType = fn.stateMutability === 'view' ? 'CallMethod' : 'SendMethod';
  return `${overloadedName ?? fn.name}: ${methodType}<${codegenInputTypes(
    fn.inputs,
  )}, ${codegenOutputTypes(fn.outputs)}>;`;
}
