import { useState, useEffect, useRef, useCallback } from 'react';
import type { Candle } from '@/lib/indicators';

const WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089';

interface TimeframeData {
  granularity: number;
  candles: Candle[];
}

/**
 * Subscribes to multiple timeframes for the same symbol.
 * Returns candle data for each timeframe.
 */
export function useMultiTimeframe(symbol: string, granularities: number[]) {
  const [data, setData] = useState<Record<number, Candle[]>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const symbolRef = useRef(symbol);
  const pendingGranularities = useRef<number[]>([]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    symbolRef.current = symbol;
    setData({});
    disconnect();

    pendingGranularities.current = [...granularities];

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ authorize: 'snbK3tya1C5W0Ap' }));
    };

    let authorizedOnce = false;
    let subscribedGranularities = new Set<number>();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.error) return;

      // After auth, subscribe to all timeframes
      if (msg.authorize && !authorizedOnce) {
        authorizedOnce = true;
        for (const g of pendingGranularities.current) {
          ws.send(JSON.stringify({
            ticks_history: symbolRef.current,
            adjust_start_time: 1,
            count: 100,
            end: 'latest',
            granularity: g,
            style: 'candles',
            subscribe: 1,
            req_id: g, // use granularity as req_id to identify responses
          }));
        }
        return;
      }

      // Historical candles - identify by req_id
      if (msg.candles && msg.req_id) {
        const g = msg.req_id as number;
        subscribedGranularities.add(g);
        const hist: Candle[] = msg.candles.map((c: any) => ({
          time: c.epoch,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
        }));
        setData(prev => ({ ...prev, [g]: hist }));
      }

      // Streaming OHLC updates
      if (msg.ohlc) {
        const ohlc = msg.ohlc;
        const g = parseInt(ohlc.granularity);
        const candle: Candle = {
          time: parseInt(ohlc.open_time),
          open: parseFloat(ohlc.open),
          high: parseFloat(ohlc.high),
          low: parseFloat(ohlc.low),
          close: parseFloat(ohlc.close),
        };

        setData(prev => {
          const existing = prev[g] || [];
          if (existing.length === 0) return { ...prev, [g]: [candle] };
          const last = existing[existing.length - 1];
          if (last.time === candle.time) {
            return { ...prev, [g]: [...existing.slice(0, -1), candle] };
          }
          return { ...prev, [g]: [...existing, candle] };
        });
      }
    };

    ws.onerror = () => setConnected(false);
    ws.onclose = () => setConnected(false);

    return () => disconnect();
  }, [symbol, granularities.join(','), disconnect]);

  return { data, connected };
}
