import BN from 'bn.js';

import {
  inputsToRequest,
  responseToOutput,
  eventOptionsToRequest,
  eventToOutput,
} from 'ethereum/converters';
import { SubscribeEventOptions } from 'ethereum/types';

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

describe('eventOptionsToRequest', () => {
  it('should convert filters', () => {
    const options: SubscribeEventOptions<any> = {
      fromBlock: 'latest',
      filter: {
        b: [new BN('190000000000000000000'), new BN('210000000000000000000')],
        c: '0x00',
      },
    };
    expect({ options, result: eventOptionsToRequest(options) }).toMatchSnapshot();
  });

  it('should not change options without filter', () => {
    const options: SubscribeEventOptions<any> = {
      fromBlock: 'latest',
    };
    expect({ options, result: eventOptionsToRequest(options) }).toMatchSnapshot();
  });
});

describe('eventToOutput', () => {
  it('should convert a mixed object from response to a mixed array', () => {
    const eventAbi = [
      {
        type: 'event' as const,
        name: 'Deposit',
        inputs: [
          { indexed: false, name: 'amount', type: 'uint256' },
          { indexed: true, name: 'user', type: 'address' },
        ],
      },
    ];
    const eventLog = {
      event: 'Deposit',
      signature: '0x00',
      returnValues: {
        0: '190000000000000000000',
        1: '0x00',
        amount: '190000000000000000000',
        user: '0x00',
      },
    };
    const result = eventToOutput(eventAbi, eventLog as any);
    expect({
      eventLog,
      result,
    }).toMatchSnapshot();

    expect(result.returnValues[0]).toEqual(result.returnValues.amount);
  });

  it('should return anonymous event without changes', () => {
    const eventAbi = [
      {
        type: 'event' as const,
        name: 'Deposit',
        inputs: [
          { indexed: false, name: 'amount', type: 'uint256' },
          { indexed: true, name: 'user', type: 'address' },
        ],
        anonymous: true,
      },
    ];
    const eventLog = {
      event: undefined,
      signature: null,
      returnValues: {
        0: '190000000000000000000',
        1: '0x00',
        amount: '190000000000000000000',
        user: '0x00',
      },
    };
    const result = eventToOutput(eventAbi, eventLog as any);
    expect({
      eventLog,
      result,
    }).toMatchSnapshot();
  });

  it('should convert tuples into objects for not indexed input types', () => {
    const eventAbi = [
      {
        type: 'event' as const,
        name: 'Stake',
        inputs: [
          {
            indexed: false,
            name: 'data',
            type: 'tuple',
            components: [
              { type: 'uint256', name: 'amount' },
              { type: 'address', name: 'user' },
            ],
          },
        ],
      },
    ];
    const eventLog = {
      event: 'Stake',
      signature: '0x00',
      returnValues: {
        0: {
          0: '190000000000000000000',
          1: '0x00',
          amount: '190000000000000000000',
          address: '0x00',
        },
        data: {
          0: '190000000000000000000',
          1: '0x00',
          amount: '190000000000000000000',
          address: '0x00',
        },
      },
    };
    const result = eventToOutput(eventAbi, eventLog as any);
    expect({
      eventLog,
      result,
    }).toMatchSnapshot();
  });

  it('should return Keccak-256 hash for indexed reference types', () => {
    const eventAbi = [
      {
        type: 'event' as const,
        name: 'Stake',
        inputs: [
          {
            indexed: true,
            name: 'data',
            type: 'tuple',
            components: [
              { type: 'uint256', name: 'amount' },
              { type: 'address', name: 'user' },
            ],
          },
          {
            indexed: true,
            name: 'type',
            type: 'string',
          },
        ],
      },
    ];
    const eventLog = {
      event: 'Stake',
      signature: '0x00',
      returnValues: {
        0: '0x00',
        1: '0x00',
        data: '0x00',
        type: '0x00',
      },
    };
    const result = eventToOutput(eventAbi, eventLog as any);
    expect({
      eventLog,
      result,
    }).toMatchSnapshot();
  });
});
