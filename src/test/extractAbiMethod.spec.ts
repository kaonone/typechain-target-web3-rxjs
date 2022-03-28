import { extractAbiMethod } from 'ethereum/utils';

import testAbi from './abi/testAbi.json';

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('extractAbiMethod', () => {
  it('should return ABI for simple method', () => {
    const method = 'testSend';
    expect({ method, result: extractAbiMethod(testAbi as any, method) }).toMatchSnapshot();
  });

  it('should return ABI for overloaded method', () => {
    const method = 'testRead((bool,address[2],(uint256,uint256)[]),(bytes,string),uint256)';
    expect({ method, result: extractAbiMethod(testAbi as any, method) }).toMatchSnapshot();
  });

  it('should return first ABI for overloaded methods if simple name used', () => {
    const method = 'testRead';
    expect({ method, result: extractAbiMethod(testAbi as any, method) }).toMatchSnapshot();
  });

  it('should return null when method not found', () => {
    const method = 'unknownMethod';
    expect({ method, result: extractAbiMethod(testAbi as any, method) }).toMatchSnapshot();
  });
});
