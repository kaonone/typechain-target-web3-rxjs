/* eslint-disable prettier/prettier */
/* eslint-disable import/no-extraneous-dependencies */
import { Contract } from 'typechain';

import { codegenEventsInputTypes, codegenEvents, codegenPastEvents } from './events';
import { codegenMethods } from './methods';
import { createUsedImports, unfoldOverloadedDeclarations } from './utils';

export function transform(contract: Contract) {
  const contractName = `${contract.name.slice(0, 1).toLowerCase()}${contract.name.slice(1)}`;
  const name = contractName.split('.')[0];
  const Name = `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;

  const functions = unfoldOverloadedDeclarations(contract.functions);
  const events = unfoldOverloadedDeclarations(contract.events).filter(event => !event.isAnonymous);

  const template = `
import ${name} from './abi/${contractName}';

export const create${Name} = makeContractCreator<${Name}Contract>(${name} as any[]);

interface ${Name}Contract extends ContractWrapper {
  methods: {
    ${codegenMethods(functions)}
  };
  events: {
    ${codegenEvents(events)}
  };
  getPastEvents: ${codegenPastEvents(events)};
}

${codegenEventsInputTypes(events)}
  `;
  const imports = createUsedImports(
    { 
      'bn.js': [['BN', true]],
      './utils/types': [
        'ContractWrapper',
        'CallMethod',
        'SendMethod',
        'EventMethod',
        'PastEventsMethod',
      ],
      './utils/makeContractCreator': ['makeContractCreator'],
    },
    template,
  );

  return imports + template;
}