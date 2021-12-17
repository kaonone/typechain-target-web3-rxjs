import { parse } from 'typechain';

import { transform } from 'transform';

describe('transform', () => {
  it('should throw error when unknown input type occurs', () => {
    const errorAbi = [
      {
        name: 'testError',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'a', type: 'string' },
          { name: 'b', type: 'NotSupported' },
        ],
        outputs: [],
      },
    ];
    const contract = parse(errorAbi as any, 'errorContract');
    const errorTransform = () => transform(contract);
    expect(errorTransform).toThrowErrorMatchingSnapshot();
  });

  it('should throw error when unknown output type occurs', () => {
    const errorAbi = [
      {
        name: 'testError',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
          {
            name: '',
            type: 'tuple',
            components: [
              {
                name: '',
                type: 'NotSupported',
              },
              {
                name: '',
                type: 'address',
              },
            ],
          },
        ],
      },
    ];
    const contract = parse(errorAbi as any, 'errorContract');
    const errorTransform = () => transform(contract);
    expect(errorTransform).toThrowErrorMatchingSnapshot();
  });
});
