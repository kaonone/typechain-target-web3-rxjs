import { fromEventPattern, Observable } from 'rxjs';
import { EventData } from 'web3-eth-contract';

type EventEmitter = {
  on(event: string, handler: (event: EventData) => void): EventEmitter;
};

export function fromWeb3DataEvent(emitter: EventEmitter): Observable<EventData> {
  interface IUnsubscribable {
    unsubscribe: () => void;
  }

  return fromEventPattern<EventData>(
    handler => emitter.on('data', handler),
    (_, signal: IUnsubscribable) => signal.unsubscribe(),
  );
}
