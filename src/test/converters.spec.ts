import BN from 'bn.js';

import { inputsToRequest, responseToOutput } from 'ethereum/converters';

describe('inputsToRequest', () => {
  it('should convert an object of arguments to an array of web3.js arguments', () => {
    const inputsAbi = [
      {
        name: 'a',
        type: 'tuple',
        components: [
          {
            name: 'x',
            type: 'tuple[]',
            components: [
              { name: 't', type: 'string[]' },
              { name: 'p', type: 'address[]' },
            ],
          },
          { name: 'y', type: 'int256[]' },
          { name: 'z', type: 'bool[]' },
        ],
      },
    ];
    const args = {
      a: {
        x: [
          { t: ['string', 'string'], p: ['0x00', '0x00'] },
          { t: ['string', 'string'], p: ['0x00', '0x00'] },
        ],
        y: [new BN('190000000000000000000'), new BN('210000000000000000000')],
        z: [true, false, true],
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

  it('should support unnamed arguments', () => {
    const inputsAbi = [
      { name: '', type: 'uint256[]' },
      { name: 'b', type: 'address' },
    ];
    const args = {
      0: [new BN('190000000000000000000'), new BN('210000000000000000000')],
      b: '0x00',
    };
    expect({ args, result: inputsToRequest(inputsAbi, args) }).toMatchSnapshot();
  });
});

describe('responseToOutput', () => {
  it('should return array of tuple components when length equals 1', () => {
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

    const response = ['190000000000000000000', '0x00', true];
    expect({
      response,
      result: responseToOutput(outputsAbi, response),
    }).toMatchSnapshot();
  });

  it('should return a mixed array when ABI length is greater than 1', () => {
    const outputsAbi = [
      { name: 'a', type: 'address' },
      {
        name: 'b',
        type: 'tuple[]',
        components: [
          {
            name: 'x',
            type: 'tuple',
            components: [
              {
                name: '',
                type: 'string',
              },
            ],
          },
          { name: 'y', type: 'bool[]' },
        ],
      },
    ];

    const response = {
      0: '0x00',
      1: [[['string'], [true, false]]],
      a: '0x00',
      b: [[['string'], [true, false]]],
    };
    expect({
      response,
      result: responseToOutput(outputsAbi, response),
    }).toMatchSnapshot();
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
    const response = { 0: '190000000000000000000', 1: '0x00' };
    expect({
      response,
      result: responseToOutput(outputsAbi, response),
    }).toMatchSnapshot();
  });

  it('should support both numeric and string keys', () => {
    const outputsAbi = [
      { name: 'a', type: 'uint256' },
      { name: 'b', type: 'address[]' },
      {
        name: 't',
        type: 'tuple[]',
        components: [
          { name: 'x', type: 'string' },
          { name: 'y', type: 'address[]' },
          { name: 'z', type: 'bool' },
        ],
      },
    ];
    const response = {
      0: '190000000000000000000',
      1: ['0x00', '0x00'],
      2: [
        ['Hello', ['0x00', '0x00', '0x00'], true],
        ['Hello', ['0x00', '0x00', '0x00'], false],
      ],
      a: '190000000000000000000',
      b: ['0x00', '0x00'],
      t: [
        ['Hello', ['0x00', '0x00', '0x00'], true],
        ['Hello', ['0x00', '0x00', '0x00'], false],
      ],
    };
    const output = responseToOutput(outputsAbi, response);
    expect({ response, tupleComponentKeys: Object.keys((output as any).t[0]) }).toMatchSnapshot();
  });
});
