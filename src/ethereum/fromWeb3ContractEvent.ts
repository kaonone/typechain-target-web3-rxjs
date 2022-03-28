import { fromEventPattern, merge, Observable, throwError, Unsubscribable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EventData } from 'web3-eth-contract';

type EventEmitter = {
  on(event: string, handler: (event: EventData) => void): EventEmitter;
};

export function fromWeb3ContractEvent(emitter: EventEmitter): Observable<EventData> {
  const data$ = fromEventPattern<EventData>(
    handler => emitter.on('data', handler),
    (_, signal: Unsubscribable) => signal.unsubscribe(),
  );

  const changed$ = fromEventPattern<EventData>(
    handler => emitter.on('changed', handler),
    (_, signal: Unsubscribable) => signal.unsubscribe(),
  );

  const error$ = fromEventPattern(
    handler => emitter.on('error', handler),
    (_, signal: Unsubscribable) => signal.unsubscribe(),
  ).pipe(switchMap(error => throwError(error)));

  return merge(data$, changed$, error$);
}
