import { Contract, EventDeclaration, getSignatureForFn } from 'typechain';

import { codegenInputTypes } from './types';

export function codegenEvents(events: Contract['events']): string {
  return Object.values(events)
    .map(evs => {
      if (evs.length === 1) {
        return codegenForSingleEvent(evs[0]);
      }
      return codegenForOverloadedEvents(evs);
    })
    .join('\n');
}

function codegenForOverloadedEvents(events: EventDeclaration[]): string {
  return [
    codegenForSingleEvent(events[0]),
    ...events.map(e => codegenForSingleEvent(e, `'${getSignatureForFn(e as any)}'`)),
  ].join('\n');
}

function codegenForSingleEvent(event: EventDeclaration, overloadedName?: string): string {
  return `${overloadedName ?? event.name}: EventMethod<
    ${codegenInputTypes(event.inputs)},
    ${codegenInputTypes(event.inputs.filter(e => e.isIndexed))}
  >`;
}

export function codegenPastEvents(events: Contract['events']): string {
  return Object.values(events)
    .flat()
    .map(x => x.name)
    .join(';\n'); // TODO unmock
}

function codegenFor