import { O } from 'ts-toolbelt';
import {
  AbiOutputParameter,
  AbiParameter,
  EventDeclaration,
  EvmType,
  EvmOutputType,
  FunctionDeclaration,
  TupleType,
  getUsedIdentifiers,
  ArrayType,
  EventArgDeclaration,
} from 'typechain';

export function unfoldOverloadedDeclarations<T extends FunctionDeclaration | EventDeclaration>(
  declaration: Record<string, T[]>,
): T[] {
  const toOverloadedDeclaration = (entry: T) => ({
    ...entry,
    name: `"${getSignatureForFn(entry as FunctionDeclaration)}"`,
  });

  return Object.values(declaration).flatMap(entries =>
    entries.length === 1 ? entries[0] : [entries[0], ...entries.map(toOverloadedDeclaration)],
  );
}

export function codegenInputTypes(inputs: O.Optional<AbiParameter, 'name'>[]): string {
  if (inputs.length === 0) {
    return 'void';
  }
  return `{
    ${inputs
      .map((input, index) => `${input.name || index}: ${codegenInputType(input.type)}`)
      .join(';\n')}
  }`;
}

export function codegenOutputTypes(outputs: O.Optional<AbiOutputParameter, 'name'>[]): string {
  if (outputs.length === 1) {
    return codegenOutputType(outputs[0].type);
  }
  return `[
      ${outputs.map(t => codegenOutputType(t.type)).join(', ')}
    ] & {
      ${outputs
        .filter(t => !!t.name)
        .map(t => `${t.name}: ${codegenOutputType(t.type)}`)
        .join(';\n')}
    }`;
}

export function codegenEventInputTypes(inputs: O.Optional<EventArgDeclaration, 'name'>[]): string {
  if (inputs.length === 0) {
    return 'void';
  }
  return `{
    ${inputs
      .map(
        (input, index) =>
          `${input.name || index}: ${
            input.isIndexed
              ? codegenEventIndexedInputType(input.type)
              : codegenInputType(input.type)
          }`,
      )
      .join(';\n')}
  }`;
}
export function codegenInputType(evmType: EvmType): string {
  switch (evmType.type) {
    case 'integer':
    case 'uinteger':
      return 'BN';
    case 'address':
      return 'string';
    case 'bytes':
    case 'dynamic-bytes':
      return 'string';
    case 'array':
      return evmType.size
        ? `[${Array.from(Array(evmType.size), () => codegenInputType(evmType.itemType)).join(
            ', ',
          )}]`
        : `(${codegenInputType(evmType.itemType)})[]`;
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    case 'tuple':
      return codegenInputTupleType(evmType);
    case 'unknown':
    default:
      throw new Error(`Unhandled type while code generation: ${evmType.originalType}`);
  }
}

function codegenInputTupleType(tuple: TupleType) {
  return `{
    ${tuple.components
      .map((component, index) => `${component.name || index}: ${codegenInputType(component.type)}`)
      .join(';\n')}
  }`;
}

function codegenOutputType(evmType: EvmOutputType): string {
  switch (evmType.type) {
    case 'integer':
    case 'uinteger':
      return 'BN';
    case 'address':
      return 'string';
    case 'bytes':
    case 'dynamic-bytes':
      return 'string';
    case 'array':
      return evmType.size
        ? `[${Array.from(Array(evmType.size), () => codegenOutputType(evmType.itemType)).join(
            ', ',
          )}]`
        : `(${codegenOutputType(evmType.itemType)})[]`;
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    case 'void':
      return 'void';
    case 'tuple':
      return codegenOutputTupleType(evmType);
    case 'unknown':
    default:
      throw new Error(`Unhandled type while code generation: ${evmType.originalType}`);
  }
}

function codegenOutputTupleType(tuple: TupleType) {
  return `[
    ${tuple.components.map(component => codegenOutputType(component.type)).join(', ')}
  ] & {
    ${tuple.components
      .filter(component => !!component.name)
      .map(component => `${component.name}: ${codegenOutputType(component.type)}`)
      .join(';\n')}
  }`;
}

/*
 * Reference types are encoded in Keccak-256 hash for indexed inputs.
 * See: https://docs.soliditylang.org/en/v0.8.13/contracts.html#events
 */
export function codegenEventIndexedInputType(evmType: EvmType): string {
  switch (evmType.type) {
    case 'integer':
    case 'uinteger':
      return 'BN';
    case 'address':
    case 'bytes':
    case 'dynamic-bytes':
    case 'array':
    case 'boolean':
    case 'string':
    case 'tuple':
      return 'string';
    case 'unknown':
    default:
      throw new Error(`Unhandled type while code generation: ${evmType.originalType}`);
  }
}

export function uniq<T>(array: T[]): T[] {
  return array.reduce((acc, curr) => (acc.includes(curr) ? acc : [...acc, curr]), [] as T[]);
}

type ModuleSpecifier = string;
type Name = string;
type isDefault = true;
type Identifier = [Name, isDefault] | Name;

export function createUsedImports(
  possibleImports: Record<ModuleSpecifier, Identifier[]>,
  sourceFile: string,
) {
  return Object.entries(possibleImports)
    .map(([moduleSpecifier, identifiers]) => {
      const usedIdentifiers = getUsedIdentifiers(
        identifiers.map(x => getIdentifierName(x)),
        sourceFile,
      );
      return createImportDeclaration(
        identifiers.filter(x => usedIdentifiers.includes(getIdentifierName(x))),
        moduleSpecifier,
      );
    })
    .filter(x => x)
    .join('\n');
}

function createImportDeclaration(identifiers: Identifier[], moduleSpecifier: string) {
  const [defaultImport] = identifiers.find(x => typeof x !== 'string') || [];
  const restIdentifiers = identifiers.filter(x => typeof x === 'string');

  const namedImports = restIdentifiers.length > 0 ? `{ ${restIdentifiers.join(', ')} }` : '';
  const allImports = [defaultImport, namedImports].filter(x => !!x).join(', ');
  return allImports.length ? `import ${allImports} from '${moduleSpecifier}'` : '';
}

function getIdentifierName(identifier: Identifier) {
  return typeof identifier === 'string' ? identifier : identifier[0];
}

function getSignatureForFn(fn: FunctionDeclaration) {
  return `${fn.name}(${fn.inputs.map(i => getArgumentForSignature(i)).join(',')})`;
}

function getArgumentForSignature(argument: AbiParameter): string {
  if (argument.type.originalType === 'tuple') {
    return `(${(argument.type as TupleType).components
      .map(i => getArgumentForSignature(i))
      .join(',')})`;
  }
  const match = argument.type.originalType.match(/tuple\[(\d*)\]/);
  if (match) {
    return `${getArgumentForSignature({
      name: '',
      type: (argument.type as ArrayType).itemType,
    })}[${match[1]}]`;
  }

  return argument.type.originalType;
}
