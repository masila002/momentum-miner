import { useState, useEffect, useRef, useCallback } from 'react';
import type { Candle } from '@/lib/indicators';

const WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089';

interface TickData {
  epoch: number;
  quote: number;
}

export function useDerivWebSocket(symbol: string, granularity: number = 60) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const symbolRef = useRef(symbol);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    symbolRef.current = symbol;
    setCandles([]);
    setCurrentPrice(null);
    setError(null);
    disconnect();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Request candle history (1 minute candles, last 100)
      ws.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 100,
        end: 'latest',
        granularity,
        style: 'candles',
        subscribe: 1,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        setError(data.error.message);
        return;
      }

      // Historical candles
      if (data.candles) {
        const hist: Candle[] = data.candles.map((c: any) => ({
          time: c.epoch,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
        }));
        setCandles(hist);
        if (hist.length > 0) {
          setCurrentPrice(hist[hist.length - 1].close);
        }
      }

      // Streaming candle update (OHLC)
      if (data.ohlc) {
        const ohlc = data.ohlc;
        const candle: Candle = {
          time: parseInt(ohlc.open_time),
          open: parseFloat(ohlc.open),
          high: parseFloat(ohlc.high),
          low: parseFloat(ohlc.low),
          close: parseFloat(ohlc.close),
        };
        setCurrentPrice(candle.close);

        setCandles(prev => {
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.time === candle.time) {
            // Update existing candle
            return [...prev.slice(0, -1), candle];
          }
          // New candle
          return [...prev, candle];
        });
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      disconnect();
    };
  }, [symbol, granularity, disconnect]);

  return { candles, currentPrice, connected, error };
}
