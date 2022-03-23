import { Observable, from, merge, EMPTY, ReplaySubject } from 'rxjs';
import { skipUntil, mergeMap, throttleTime, switchMap, shareReplay } from 'rxjs/operators';
import { Eth } from 'web3-eth';
import { Contract } from 'web3-eth-contract';

import {
  EventLog,
  CallOptions,
  Web3ContractInputArgs,
  Web3ContractResponse,
  Response,
} from './types';

interface IOptions {
  eventsForReload?: Observable<EventLog<any>> | Observable<EventLog<any>>[];
  reloadTrigger$?: Observable<any>;
  args?: Web3ContractInputArgs;
  convert?(value: Web3ContractResponse): Response | void;
  tx?: CallOptions;
}

function identity(value: any) {
  return value;
}

function awaitMs(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

export function getContractData$(
  contract: Contract,
  eth: Eth,
  method: string,
  options: IOptions = {},
): Observable<Response> {
  const { eventsForReload = [], reloadTrigger$ = EMPTY, args = [], convert = identity } = options;

  const load = async () => {
    const data = await contract.methods[method](...args).call(options.tx);
    return convert(data);
  };

  const reloadEvents = Array.isArray(eventsForReload) ? eventsForReload : [eventsForReload];

  const first$ = from(load());
  const fromEvents$ = merge(...reloadEvents).pipe(
    skipUntil(first$),
    throttleTime(200),
    switchMap(async event => {
      let currentBlock = await eth.getBlockNumber();

      /* eslint-disable no-await-in-loop */
      while (currentBlock < event.blockNumber) {
        await awaitMs(500);
        currentBlock = await eth.getBlockNumber();
      }
      /* eslint-enable no-await-in-loop */

      return event;
    }),
    mergeMap(() => from(load()), 1),
    shareReplay(1),
  );

  const subject = new ReplaySubject<Response>(1);

  merge(first$, fromEvents$, reloadTrigger$).subscribe(subject);

  return subject;
}
