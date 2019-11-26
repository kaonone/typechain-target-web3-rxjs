import { fromEventPattern, Observable } from 'rxjs';
import { EventEmitter, EventLog } from 'web3/types';

export function fromWeb3DataEvent(emitter: EventEmitter): Observable<EventLog> {
  interface IUnsubscribable {
    unsubscribe: () => void;
  }

  return fromEventPattern<EventLog>(
    handler => emitter.on('data', handler as (event: EventLog) => void),
    (_, signal: IUnsubscribable) => signal.unsubscribe(),
  );
}
