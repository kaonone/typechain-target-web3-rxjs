# Typechain Target Web3-RxJS [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

The custom target for [Typechain](https://github.com/ethereum-ts/TypeChain). Generates Factory for Web3 contracts using ABI. Factory returns typed wrapper for `Web3.eth.Contract`. Factory allows subscribing to contract using RxJS streams.

## Installation

```
npm install --save-dev typechain typechain-target-web3-rxjs
```

## How to use it

```
npx typechain --target web3-rxjs --outDir src/generated/contracts **/*.abi.json
```

After calling this command you can get access to all factories from `src/generated/contracts/index.ts`

## Examples

```typescript
import Web3 from 'web3';
import { createErc20 } from 'src/generated/contracts';

const web3 = new Web3(PROVIDER);

const dai = createErc20(web3, '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea');

// read and don’t update. By default behavior
dai.methods.totalSupply();
dai.methods.totalSupply(undefined, 'none');

// read and update on any event
dai.methods.totalSupply(undefined, 'all');

// read and update on some events
dai.methods.balanceOf(
  { _owner: MY_ADDRESS },
  { Transfer: [{ filter: { _from: MY_ADDRESS } }, { filter: { _to: MY_ADDRESS } }] },
);

// call method (send transaction)
dai.methods.transfer(
  { _to: '0x00...0000', _value: new BN('100000000000') },
  { from: MY_ADDRESS },
);
```
