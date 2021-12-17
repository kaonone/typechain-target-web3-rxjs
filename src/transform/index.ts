/* eslint-disable prettier/prettier */
/* eslint-disable import/no-extraneous-dependencies */
import { Contract } from 'typechain';

import { codegenEvents, codegenPastEvents } from './events';
import { codegenMethods } from './methods';

export function transform(contract: Contract) {
  const contractName = `${contract.name.slice(0, 1).toLowerCase()}${contract.name.slice(1)}`;
  const name = contractName.split('.')[0];
  const Name = `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;

  // const methods = Object.values(contract.functions).map(v => v[0]);

  const template = `
import * as utils from './utils/makeContractCreator';
import { ContractWrapper } from './utils/types';

import ${name} from './abi/${contractName}';

export const create${Name} = utils.makeContractCreator<>(${name} as any[]);

interface ${Name}Contract extends ContractWrapper {
  methods: {
    ${codegenMethods(contract.functions)}
  };
  events: {
    ${codegenEvents(contract.events)}
  };
  getPastEvents: {
    ${codegenPastEvents(contract.events)}
  };
}
  `;

  return template;
}

/* 
interface TestContract extends ContractWrapper {
  methods: {
    testRead: CallMethod<{ s: { a: boolean; b: string[]; c: { x: BN; y: BN }[] }; t: { x: string; y: string }, a: BN }, void>;
    'testRead((boolean,address[],(uint256,uint256)[]),(bytes,string),uint256)': CallMethod<{ s: { a: boolean; b: string[]; c: { x: BN; y: BN }[] }; t: { x: string; y: string }, a: BN }, void>;
    'testRead()': CallMethod<void, void>;
    testSend: SendMethod<{ s: { a: BN; b: BN[]; c { x: BN; y: BN }[] }; t: { x: string; y: string }, a: BN }, boolean>;
  };
  events: {
    TestEvent: EventMethod<EventInput>;
    TestEvent1: EventMethod<Event1Input>;
    TestEvent2: EventMethod<Event2Input>;
    allEvents: EventMethod<EventInput & Event1Input & Event2Input>;
  };
  getPastEvents: PastEventsMethod<{
    TestEvent: EventInput;
    TestEvent1: Event1Input;
    TestEvent2: Event2Input;
  }>;
}
*/
