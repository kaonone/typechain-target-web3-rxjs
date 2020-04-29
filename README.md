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
const anotherContract = createAnotherContract(web3, '0x0000000000000000000000000000000000000000');

// read and don’t update. By default behavior
dai.methods.totalSupply();

// read and update on one events
dai.methods.totalSupply(undefined, dai.events.Transfer());

// read and update on all events
dai.methods.totalSupply(undefined, dai.events.allEvents());

// read and update on multiple events with filters
dai.methods.balanceOf(
  { _owner: MY_ADDRESS },
  [
    dai.events.Transfer({ filter: { _from: MY_ADDRESS } }),
    dai.events.Transfer({ filter: { _to: MY_ADDRESS } }),
  ],
);

// read and update on some event from another contract
dai.methods.balanceOf(
  { _owner: MY_ADDRESS },
  anotherContract.events.SomeEvent(),
);

// call method (send transaction)
dai.methods.transfer(
  { _to: '0x00...0000', _value: new BN('100000000000') },
  { from: MY_ADDRESS },
);
```
