import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { map } from 'rxjs/operators';

import { getContractData$ } from './getContractData$';
import {
  SendOptions,
  ContractWrapper,
  CallMethod,
  ReadMethod,
  SendMethod,
  Arguments,
  EventMethod,
  EventLog,
} from './types';
import { attachStaticFields, extractAbiMethod } from './utils';
import {
  eventOptionsToRequest,
  eventToOutput,
  inputsToRequest,
  responseToOutput,
} from './converters';
import { fromWeb3DataEvent } from './fromWeb3DataEvent';

export function makeContractCreator<C extends ContractWrapper>(abi: any[]) {
  return (web3: Web3, address: string): C => {
    const baseContract = new web3.eth.Contract(abi, address);

    const methodsProxy = makeMethodsProxy(abi, web3, baseContract);
    const eventsProxy = makeEventsProxy(abi, baseContract);
    const getPastEventsProxy = makeGetPastEventsProxy(abi, baseContract);

    return (new Proxy<Contract>(baseContract, {
      get(target, prop: keyof Contract) {
        if (prop === 'methods') {
          return methodsProxy;
        }
        if (prop === 'events') {
          return eventsProxy;
        }
        if (prop === 'getPastEvents') {
          return getPastEventsProxy;
        }
        return target[prop];
      },
    }) as unknown) as C;
  };
}

function makeMethodsProxy(abi: any, web3: Web3, baseContract: Contract) {
  return new Proxy<Contract['methods']>(
    {},
    {
      get(target: Contract['methods'], prop: string) {
        const methodAbi = extractAbiMethod(abi, prop);

        if (!methodAbi) {
          return target[prop];
        }

        const baseCallFunction: CallMethod<any, any> = (input, eventsForReload, tx) =>
          getContractData$(baseContract, web3.eth, prop, {
            tx,
            args: input ? inputsToRequest(methodAbi.inputs, input) : [],
            eventsForReload,
            convert: result => (result ? responseToOutput(methodAbi.outputs, result) : undefined),
          });

        const callFunction: CallMethod<any, any> = baseCallFunction;

        const readFunction: ReadMethod<any, any> = (input, tx, eventsForReload) =>
          baseCallFunction(input, eventsForReload, tx);

        if (methodAbi.stateMutability === 'view') {
          return callFunction;
        }

        const getTransactionFunction = (input: void | Arguments) => {
          const args = input ? inputsToRequest(methodAbi.inputs, input) : [];
          return baseContract.methods[prop](...args);
        };

        const sendFunction: SendMethod<any, any> = attachStaticFields(
          (input: void | Arguments, tx: SendOptions) => getTransactionFunction(input).send(tx),
          {
            getTransaction: getTransactionFunction,
            read: readFunction,
          },
        );

        return sendFunction;
      },
    },
  );
}

function makeEventsProxy(abi: any, baseContract: Contract) {
  return new Proxy<Contract['events']>(
    {},
    {
      get: (_, prop: string) => {
        const eventFunction: EventMethod<any, any> = (options, callback) => {
          const convertedOptions = options && eventOptionsToRequest(options);
          const convertedCallback = (error: Error, event: EventLog<any>) => {
            if (error) {
              return callback?.(error, event);
            }
            return callback?.(error, eventToOutput(abi, event));
          };

          return fromWeb3DataEvent(
            baseContract.events[prop](convertedOptions, convertedCallback),
          ).pipe(map(event => eventToOutput(abi, event)));
        };

        return eventFunction;
      },
    },
  );
}

function makeGetPastEventsProxy(abi: any, baseContract: Contract) {
  return new Proxy(baseContract.getPastEvents, {
    apply: (target, thisArgs, args) => {
      const [event, ...restArgs] = args;

      const options = typeof restArgs[0] !== 'function' ? restArgs[0] : undefined;
      const convertedOptions = options && eventOptionsToRequest(options);

      const callback = restArgs[0] === 'function' ? restArgs[0] : restArgs[1];
      const convertedCallback = (error: Error, events: EventLog<any>[]) => {
        if (error) {
          return callback?.(error, events);
        }

        return callback?.(
          error,
          events.map(e => eventToOutput(abi, e)),
        );
      };

      return target
        .apply(thisArgs, [event, convertedOptions, convertedCallback] as any)
        .then(eventLogs => eventLogs.map(e => eventToOutput(abi, e)));
    },
  });
}
