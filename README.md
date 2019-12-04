# Typechain Target Web3-RxJS [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Кастомный таргет для [Typechain](https://github.com/ethereum-ts/TypeChain). Генерирует фабрики Web3 контрактов на основе ABI. Фабрика возвращает типизированную обертку над `Web3.eth.Contract`, которая позволяет слушать поля контракта с помощью rxjs потоков.

## Установка

```
npm install --save-dev typechain typechain-target-web3-rxjs
```

## Использование

```
npx typechain --target web3-rxjs --outDir src/generated/contracts **/*.abi.json
```

После запуска команды ко всем фабрикам можно получить доступ из `src/generated/contracts/index.ts`

## Примеры кода

```typescript
import Web3 from 'web3';
import { createErc20 } from 'src/generated/contracts';

const web3 = new Web3(PROVIDER);

const dai = createErc20(web3, '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea');

// читаем и никогда не обновляем. Дефолтное поведение.
dai.methods.totalSupply();
dai.methods.totalSupply(undefined, 'none');

// читаем и обновляем на любой эвент
dai.methods.totalSupply(undefined, 'all');

// читаем и обновляем только на определенные эвенты
dai.methods.balanceOf(
  { _owner: MY_ADDRESS },
  { Transfer: [{ filter: { _from: MY_ADDRESS } }, { filter: { _to: MY_ADDRESS } }] },
);

// вызываем метод (отправка транзакции)
dai.methods.transfer(
  { _to: '0x00...0000', _value: new BN('100000000000') },
  { from: MY_ADDRESS },
);
```
