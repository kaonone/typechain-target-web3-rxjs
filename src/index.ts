/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-default-export */
import { TsGeneratorPlugin, TContext, TFileDesc } from 'ts-generator';
import { join, resolve } from 'path';
import { extractAbi, parse, getFilename } from 'typechain';

// @ts-ignore
import fromWeb3DataEvent from './ethereum/fromWeb3DataEvent';
// @ts-ignore
import getContractData$ from './ethereum/getContractData$';
// @ts-ignore
import makeContractCreator from './ethereum/makeContractCreator';
import { transform } from './transform';

export interface IWeb3Cfg {
  outDir?: string;
}

const DEFAULT_OUT_PATH = './generated/';

export default class Web3 extends TsGeneratorPlugin {
  name = 'Web3';

  private readonly outDirAbs: string;
  private readonly creatorNames: string[] = [];

  constructor(ctx: TContext<IWeb3Cfg>) {
    super(ctx);

    const { cwd, rawConfig } = ctx;

    this.outDirAbs = resolve(cwd, rawConfig.outDir || DEFAULT_OUT_PATH);
  }

  transformFile(file: TFileDesc): TFileDesc[] | undefined {
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

  afterRun(): TFileDesc[] {
    return [
      {
        path: join(this.outDirAbs, 'utils/fromWeb3DataEvent.ts'),
        contents: fromWeb3DataEvent,
      },
      {
        path: join(this.outDirAbs, 'utils/getContractData$.ts'),
        contents: getContractData$,
      },
      {
        path: join(this.outDirAbs, 'utils/makeContractCreator.ts'),
        contents: makeContractCreator,
      },
      {
        path: join(this.outDirAbs, 'utils/types.ts'),
        contents: makeContractCreator,
      },
      {
        path: join(this.outDirAbs, 'index.ts'),
        contents: this.creatorNames.map(name => `export { ${name} } from './${name}'`).join('\n'),
      },
    ];
  }
}
