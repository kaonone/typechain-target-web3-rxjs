import { fromEventPattern, Observable } from 'rxjs';
import { EventLog } from 'web3-core';

import { EventEmitter } from './types';

export function fromWeb3DataEvent(emitter: EventEmitter<any>): Observable<EventLog> {
  interface IUnsubscribable {
    unsubscribe: () => void;
  }

  return fromEventPattern<EventLog>(
    handler => emitter.on('data', handler as (event: EventLog) => void),
    (_, signal: IUnsubscribable) => signal.unsubscribe(),
  );
}
