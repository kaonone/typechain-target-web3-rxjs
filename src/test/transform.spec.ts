import { Contract, parse } from 'typechain';

import test from './test.json';
import { transform } from '../transform';

describe('transform', () => {
  let contract: Contract;
  beforeAll(() => {
    contract = parse(test as any, 'test');
  });
  it('should do anything', () => {
    expect({ contract, result: transform(contract) }).toMatchSnapshot();
  });
});
