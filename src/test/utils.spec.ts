import { getWeb3Signature } from 'ethereum/utils';

import testAbi from './test.json';

describe('getWeb3Signature', () => {
  it('should support tuple and tuple[] types', () => {
    expect(testAbi.map(abi => getWeb3Signature(abi as any))).toMatchSnapshot();
  });
});
