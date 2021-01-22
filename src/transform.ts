/* eslint-disable prettier/prettier */
/* eslint-disable import/no-extraneous-dependencies */
import {
  Contract,
  AbiParameter,
  FunctionDeclaration,
  EventDeclaration,
  AbiOutputParameter,
  EvmType,
} from 'typechain';

export function transform(contract: Contract) {
  const name = contract.name.split('.')[0];
  const Name = `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;

  const events = Object.values(contract.events).map(v => v[0]);
  const methods = Object.values(contract.functions).map(v => v[0]);
  const callMethods = methods.filter(m => m.stateMutability === 'view');
  const sendMethods = methods.filter(m => m.stateMutability !== 'view');

  const template = `
import * as utils from './utils/makeContractCreator';

import ${name} from './abi/${contract.name}';

export const create${Name} = utils.makeContractCreator(
  ${name} as any[],
  {
    callMethods: {
      ${callMethods.map(generateFunction).join('\n')}
    },
    sendMethods: {
      ${sendMethods.map(generateFunction).join('\n')}
    },
    events: {
      ${events.map(generateEvent).join('\n')}
    },
  } as const,
);
  `;

  return template;
}

function generateFunction(fn: FunctionDeclaration): string {
  return `
    ${fn.name}: {
      ${
        fn.inputs.length
          ? `inputs: [${fn.inputs.map(x => generateNamedInput(x)).join(', ')}],`
          : ''
      }
      ${fn.outputs[0] ? `output: [${fn.outputs.map(x => generateOutput(x)).join(', ')}]` : ''}
  },`;
}

function generateEvent(event: EventDeclaration) {
  return `
    ${event.name}: {
      inputs: [${event.inputs.map(x => generateNamedInput(x)).join(', ')}],
    },
  `;
}

function generateNamedInput(param: AbiParameter) {
  const params: string[] = [
    `'${param.name}'`,
    generateType(),
    param.type.type === 'array' ? 'true' : '',
  ].filter(Boolean);

  return `utils.getNamedInput(${params.join(', ')})`;

  function generateType() {
    if (param.type.type !== 'array') {
      return `'${param.type.type}'`;
    }

    if (param.type.itemType.type === 'array') {
      return generateInput(param.type.itemType);
    }

    return `'${param.type.itemType.type}'`;
  }
}

function generateInput(type: EvmType) {
  const params: string[] = [
    `'${type.type === 'array' ? type.itemType.type : type.type}'`,
    type.type === 'array' ? 'true' : '',
  ].filter(Boolean);

  return `utils.getInput(${params.join(', ')})`;
}

function generateOutput(param: AbiOutputParameter) {
  const params: string[] = [
    `'${param.type.type === 'array' ? param.type.itemType.type : param.type.type}'`,
    param.type.type === 'array' ? 'true' : '',
  ].filter(Boolean);

  return `utils.getOutput(${params.join(', ')})`;
}

// // eslint-disable-next-line consistent-return
// function generateInputType(evmType: EvmType): string {
//   // eslint-disable-next-line default-case
//   switch (evmType.type) {
//     case 'integer':
//     case 'uinteger':
//       return 'number | string';
//     case 'address':
//       return 'string';
//     case 'bytes':
//     case 'dynamic-bytes':
//       return 'string | number[]';
//     case 'array':
//       return `(${generateInputType(evmType.itemType)})[]`;
//     case 'boolean':
//       return 'boolean';
//     case 'string':
//       return 'string';
//     case 'tuple':
//       return generateTupleType(evmType, generateInputType);
//   }
// }

// // eslint-disable-next-line consistent-return
// function generateOutputType(evmType: EvmOutputType): string {
//   // eslint-disable-next-line default-case
//   switch (evmType.type) {
//     case 'integer':
//       return 'BN';
//     case 'uinteger':
//       return 'BN';
//     case 'address':
//       return 'string';
//     case 'void':
//       return 'void';
//     case 'bytes':
//     case 'dynamic-bytes':
//       return 'string';
//     case 'array':
//       return `(${generateOutputType(evmType.itemType)})[]`;
//     case 'boolean':
//       return 'boolean';
//     case 'string':
//       return 'string';
//     case 'tuple':
//       return generateTupleType(evmType, generateOutputType);
//   }
// }

// function generateTupleType(tuple: TupleType, generator: (evmType: EvmType) => string) {
//   return `{${tuple.components
//     .map(component => `${component.name}: ${generator(component.type)}`)
//     .join(', ')}}`;
// }
