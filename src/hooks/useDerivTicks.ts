import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089';

export interface Tick {
  epoch: number;
  quote: number;
}

/**
 * Subscribes to Deriv ticks stream for a single symbol.
 * Returns a rolling buffer of recent ticks plus the latest tick.
 */
export function useDerivTicks(symbol: string | null, enabled: boolean = true, maxBuffer: number = 2000) {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [latest, setLatest] = useState<Tick | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const symbolRef = useRef(symbol);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ forget_all: 'ticks' }));
      } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    symbolRef.current = symbol;
    setTicks([]);
    setLatest(null);
    setError(null);
    disconnect();

    if (!enabled || !symbol) {
      setConnected(false);
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ authorize: 'snbK3tya1C5W0Ap' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        setError(data.error.message);
        return;
      }

      if (data.authorize) {
        ws.send(JSON.stringify({
          ticks: symbolRef.current,
          subscribe: 1,
        }));
        return;
      }

      if (data.tick) {
        const t: Tick = {
          epoch: data.tick.epoch,
          quote: parseFloat(data.tick.quote),
        };
        setLatest(t);
        setTicks(prev => {
          const next = [...prev, t];
          if (next.length > maxBuffer) next.splice(0, next.length - maxBuffer);
          return next;
        });
      }
    };

    ws.onerror = () => {
      setError('Tick WebSocket error');
      setConnected(false);
    };

    ws.onclose = () => setConnected(false);

    return () => disconnect();
  }, [symbol, enabled, maxBuffer, disconnect]);

  return { ticks, latest, connected, error };
}
