/* eslint-disable import/no-default-export */
import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import {
  extractAbi,
  parse,
  getFilename,
  Config,
  TypeChainTarget,
  Output,
  FileDescription,
} from 'typechain';

import { transform } from './transform';

const DEFAULT_OUT_PATH = './generated/';

export default class Web3 extends TypeChainTarget {
  name = 'Web3';

  private readonly outDirAbs: string;
  private readonly creatorNames: string[] = [];

  constructor(ctx: Config) {
    super(ctx);

    const { cwd, outDir } = ctx;

    this.outDirAbs = resolve(cwd, outDir || DEFAULT_OUT_PATH);
  }

  transformFile(file: FileDescription): Output | Promise<Output> {
    const abi = extractAbi(file.contents);
    const isEmptyAbi = abi.length === 0;

    if (isEmptyAbi) {
      return;
    }

    const fullName = getFilename(file.path);
    const contract = parse(abi, fullName);

    const name = getFilename(file.path).split('.')[0];
    const Name = `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;

    const creatorName = `create${Name}`;
    this.creatorNames.push(creatorName);

    // eslint-disable-next-line consistent-return
    return [
      {
        path: join(this.outDirAbs, `${creatorName}.ts`),
        contents: transform(contract),
      },
      {
        path: join(this.outDirAbs, `abi/${fullName}.ts`),
        contents: `export default ${file.contents}`,
      },
    ];
  }

  afterRun() {
    const walkSync = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true, encoding: 'utf-8' }).reduce((acc, curr) => {
        const absolute = join(dir, curr.name);
        const files = curr.isDirectory() ? walkSync(absolute) : [absolute];
        return acc.concat(files);
      }, [] as string[]);

    const ethereumPath = join(__dirname, '../src/ethereum/');

    return [
      {
        path: join(this.outDirAbs, 'index.ts'),
        contents: this.creatorNames.map(name => `export { ${name} } from './${name}'`).join('\n'),
      },
      ...walkSync(ethereumPath).map(file => ({
        path: join(this.outDirAbs, 'utils', relative(ethereumPath, file)),
        contents: readFileSync(file, 'utf-8'),
      })),
    ];
  }
}
