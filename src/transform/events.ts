import { EventDeclaration } from 'typechain';

import { codegenInputTypes, uniq } from './utils';

export function codegenEvents(events: EventDeclaration[]): string {
  const format = (event: EventDeclaration) => `${event.name}: EventMethod<
  ${getEventInputName(event)},
  ${getEventIndexedInputName(event)}
>`;

  return [...events.map(format), `allEvents: ${codegenForAllEvents(events)}`].join(';\n');
}

export function codegenPastEvents(events: EventDeclaration[]): string {
  if (events.length === 0) {
    return 'void';
  }
  const formatAllEvents = (event: EventDeclaration) => `${event.name}: ${getEventInputName(event)}`;
  const formatIndexedEvents = (event: EventDeclaration) =>
    `${event.name}: ${getEventIndexedInputName(event)}`;

  return `PastEventsMethod<
  {${events.map(formatAllEvents).join(';\n')}},
  {${events.map(formatIndexedEvents).join(';\n')}}
>`;
}

export function codegenEventInputTypes(events: EventDeclaration[]): string {
  const formatAllEvents = (event: EventDeclaration) =>
    `type ${getEventInputName(event)} = ${codegenInputTypes(event.inputs)}`;
  const formatIndexedEvents = (event: EventDeclaration) =>
    `type ${getEventIndexedInputName(event)} = ${codegenInputTypes(
      event.inputs.filter(input => input.isIndexed),
    )}`;

  return `
  ${uniq(events.map(formatAllEvents)).join(';\n')}
  ${uniq(events.map(formatIndexedEvents)).join(';\n')}
`;
}

function codegenForAllEvents(events: EventDeclaration[]): string {
  return `EventMethod<
  ${uniq(events.map(getEventInputName)).join(' | ') || 'void'},
  ${uniq(events.map(getEventIndexedInputName)).join(' | ') || 'void'}
>`;
}

function getEventInputName(event: EventDeclaration) {
  return getValidTypeName(`${event.name}EventInput`);
}

function getEventIndexedInputName(event: EventDeclaration) {
  return getValidTypeName(`${event.name}EventIndexedInput`);
}

function getValidTypeName(value: string) {
  return value
    .split(/\W+/)
    .reduce(
      (acc, curr) => (curr ? `${acc}${curr.slice(0, 1).toUpperCase()}${curr.slice(1)}` : acc),
      '',
    )
    .replace(/^(\d)/, '_$1');
}
