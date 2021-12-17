/* eslint-disable prettier/prettier */
/* eslint-disable import/no-extraneous-dependencies */
import { Contract } from 'typechain';

import { codegenEventInputTypes, codegenEvents, codegenPastEvents } from './events'
import { codegenMethods } from './methods';
import { unfoldDeclarations } from './utils';

export function transform(contract: Contract) {
  const contractName = `${contract.name.slice(0, 1).toLowerCase()}${contract.name.slice(1)}`;
  const name = contractName.split('.')[0];
  const Name = `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;

  const functions = unfoldDeclarations(contract.functions)
  const events = unfoldDeclarations(contract.events);

  const template = `
import BN from 'bn.js';
import * as utils from './utils/makeContractCreator';
import { ContractWrapper, CallMethod, SendMethod, EventMethod, PastEventsMethod } from './utils/types';

import ${name} from './abi/${contractName}';

export const create${Name} = utils.makeContractCreator<${Name}Contract>(${name} as any[]);

interface ${Name}Contract extends ContractWrapper {
  methods: {
    ${codegenMethods(functions)}
  };
  events: {
    ${codegenEvents(events)}
  };
  getPastEvents: ${codegenPastEvents(events)};
}

${codegenEventInputTypes(events)}
  `;

  return template;
}
