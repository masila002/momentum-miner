import type { Candle } from './indicators';
import type { SignalLevel } from './indicators';

export interface TradeLevels {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  direction: 'long' | 'short' | null;
  atr: number;
}

/**
 * Calculate ATR (Average True Range) over a given period.
 */
function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const prev = candles[i - 1];
    const c = candles[i];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    sum += tr;
  }
  return sum / period;
}

/**
 * Auto-calculate entry, SL, and TP based on signal direction and ATR.
 * - Entry: current price
 * - SL: 1.5x ATR from entry (against trade)
 * - TP: 2.5x ATR from entry (with trade) → ~1.67 R:R
 */
export function calculateTradeLevels(
  candles: Candle[],
  signal: SignalLevel,
  currentPrice: number | null
): TradeLevels | null {
  if (!currentPrice || candles.length < 20) return null;

  const currentATR = atr(candles, 14);
  if (currentATR === 0) return null;

  const isBuy = signal === 'BUY' || signal === 'STRONG_BUY';
  const isSell = signal === 'SELL' || signal === 'STRONG_SELL';

  if (!isBuy && !isSell) return null;

  const slMultiplier = 1.5;
  const tpMultiplier = 2.5;

  const entry = currentPrice;
  let stopLoss: number;
  let takeProfit: number;

  if (isBuy) {
    stopLoss = entry - currentATR * slMultiplier;
    takeProfit = entry + currentATR * tpMultiplier;
  } else {
    stopLoss = entry + currentATR * slMultiplier;
    takeProfit = entry - currentATR * tpMultiplier;
  }

  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  const riskReward = risk > 0 ? reward / risk : 0;

  return {
    entry,
    stopLoss,
    takeProfit,
    riskReward,
    direction: isBuy ? 'long' : 'short',
    atr: currentATR,
  };
}
