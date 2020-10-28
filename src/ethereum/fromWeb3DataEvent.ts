import { fromEventPattern, Observable } from 'rxjs';
import { EventLog } from 'web3-core/types';
import { TransactionReceipt } from 'web3-eth';

/* ***** OVERRIDE WEB3 TYPES ***** */

export interface EventEmitter {
  on(type: 'data', handler: (event: EventLog) => void): EventEmitter;
  on(type: 'changed', handler: (receipt: EventLog) => void): EventEmitter;
  on(type: 'error', handler: (error: Error) => void): EventEmitter;
  on(
    type: 'error' | 'data' | 'changed',
    handler: (error: Error | TransactionReceipt | string) => void,
  ): EventEmitter;
}

/* ***** */

export function fromWeb3DataEvent(emitter: EventEmitter): Observable<EventLog> {
  interface IUnsubscribable {
    unsubscribe: () => void;
  }

  return fromEventPattern<EventLog>(
    handler => emitter.on('data', handler as (event: EventLog) => void),
    (_, signal: IUnsubscribable) => signal.unsubscribe(),
  );
}
