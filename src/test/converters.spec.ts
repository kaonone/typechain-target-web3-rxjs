import BN from 'bn.js';

import { inputsToRequest, responseToOutput } from 'ethereum/converters';

describe('inputsToRequest', () => {
  it('should convert an object of arguments to an array of web3.js arguments', () => {
    const inputsAbi = [
      {
        name: 'a',
        type: 'tuple',
        components: [
          { name: 'x', type: 'uint256' },
          { name: 'y', type: 'address' },
          { name: 'z', type: 'bool' },
        ],
      },
    ];
    const args = {
      a: {
        x: new BN('190000000000000000000'),
        y: '0x00',
        z: true,
      },
    };
    expect({ args, result: inputsToRequest(inputsAbi, args) }).toMatchSnapshot();
  });

  it('should throw an error when args mismatch ABI', () => {
    const inputsAbi = [
      { name: 'a', type: 'uint256[]' },
      { name: 'b', type: 'address' },
    ];
    const args = { A: new BN(0) };
    const errorCall = () => inputsToRequest(inputsAbi, args);
    expect(errorCall).toThrowErrorMatchingSnapshot();
  });

  it('should support arrays of plain arguments', () => {
    const inputsAbi = [
      { name: 'a', type: 'uint256[]' },
      { name: 'b', type: 'address' },
    ];
    const args = {
      a: [new BN('190000000000000000000'), new BN('210000000000000000000')],
      b: '0x00',
    };
    expect({ args, result: inputsToRequest(inputsAbi, args) }).toMatchSnapshot();
  });

  it('should support arrays of tuples', () => {
    const inputsAbi = [
      {
        name: 'a',
        type: 'tuple[]',
        components: [
          { name: 'x', type: 'uint256' },
          { name: 'y', type: 'string' },
        ],
      },
      { name: 'b', type: 'string' },
    ];
    const args = {
      a: [
        { x: new BN('190000000000000000000'), y: 'text1' },
        { x: new BN('210000000000000000000'), y: 'text2' },
      ],
      b: 'text3',
    };
    expect({ args, result: inputsToRequest(inputsAbi, args) }).toMatchSnapshot();
  });
});

describe('responseToOutput', () => {
  it('should return an array of tuple components when ABI length equals 1', () => {
    const outputsAbi = [
      {
        name: 'a',
        type: 'tuple',
        components: [
          { name: 'x', type: 'uint256' },
          { name: 'y', type: 'address' },
          { name: 'z', type: 'bool' },
        ],
      },
    ];

    const response = [['190000000000000000000', '0x00', true]];
    expect({
      response,
      result: responseToOutput(outputsAbi, response),
    }).toMatchSnapshot();
  });

  it('should return an array of result parameters when ABI length is greater than 1', () => {
    const outputsAbi = [
      { name: 'a', type: 'address' },
      {
        name: 'b',
        type: 'tuple[]',
        components: [
          { name: 'x', type: 'uint256' },
          { name: 'y', type: 'uint256' },
        ],
      },
    ];

    const response = ['0x00', [['190000000000000000000', '210000000000000000000']]];
    expect({
      response,
      result: responseToOutput(outputsAbi, response),
    }).toMatchSnapshot();
  });

  it('should throw an error when response received for empty ABI', () => {
    const outputsAbi = [] as any;
    const response = ['190000000000000000000', '0x00'];
    const errorCall = () => responseToOutput(outputsAbi, response);
    expect(errorCall).toThrowErrorMatchingSnapshot();
  });

  it('should throw an error when response mismatches ABI', () => {
    const outputsAbi = [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ] as any;
    const response = '190000000000000000000';
    const errorCall = () => responseToOutput(outputsAbi, response);
    expect(errorCall).toThrowErrorMatchingSnapshot();
  });

  it('should support unnamed parameters', () => {
    const outputsAbi = [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ];
    const response = ['190000000000000000000', '0x00'];
    expect({
      response,
      result: responseToOutput(outputsAbi, response),
    }).toMatchSnapshot();
  });

  it('should support both numeric and string keys', () => {
    const outputsAbi = [
      { name: 'a', type: 'uint256' },
      { name: 'b', type: 'address' },
    ];
    const response = ['190000000000000000000', '0x00'];
    const output = responseToOutput(outputsAbi, response);
    expect(output).toHaveProperty('b', '0x00');
    expect(output).toHaveProperty('1', '0x00');
  });
});
