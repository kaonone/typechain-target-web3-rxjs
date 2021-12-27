import { FunctionDeclaration } from 'typechain';

import { codegenInputTypes, codegenOutputTypes } from './utils';

export function codegenMethods(functions: FunctionDeclaration[]): string {
  const format = (fn: FunctionDeclaration) => {
    const methodType = fn.stateMutability === 'view' ? 'CallMethod' : 'SendMethod';
    return `${fn.name}: ${methodType}<${codegenInputTypes(fn.inputs)}, ${codegenOutputTypes(
      fn.outputs,
    )}>`;
  };

  return functions.map(format).join(';\n');
}
