import type { Candle } from './indicators';
import { rsi } from './indicators';

export type DivergenceType = 'bullish_regular' | 'bearish_regular' | 'bullish_hidden' | 'bearish_hidden';

export interface Divergence {
  type: DivergenceType;
  label: string;
  bias: 'bullish' | 'bearish';
  /** Index of the second (more recent) pivot */
  index: number;
  /** Index of the first (older) pivot */
  startIndex: number;
  strength: number; // 0-1
}

export interface DivergenceResult {
  divergences: Divergence[];
  /** Most recent active divergence, if any */
  active: Divergence | null;
  /** Signal modifier: positive = bullish divergence, negative = bearish */
  signal: number; // -1 to 1
}

/**
 * Find swing lows in a series (local minima within lookback window).
 */
function findSwingLows(data: number[], lookback: number): { index: number; value: number }[] {
  const swings: { index: number; value: number }[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    if (isNaN(data[i])) continue;
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i || isNaN(data[j])) continue;
      if (data[j] <= data[i]) { isLow = false; break; }
    }
    if (isLow) swings.push({ index: i, value: data[i] });
  }
  return swings;
}

/**
 * Find swing highs in a series (local maxima within lookback window).
 */
function findSwingHighs(data: number[], lookback: number): { index: number; value: number }[] {
  const swings: { index: number; value: number }[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    if (isNaN(data[i])) continue;
    let isHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i || isNaN(data[j])) continue;
      if (data[j] >= data[i]) { isHigh = false; break; }
    }
    if (isHigh) swings.push({ index: i, value: data[i] });
  }
  return swings;
}

/**
 * Detect RSI divergences from candle data.
 *
 * Regular bullish: Price makes lower low, RSI makes higher low → reversal up
 * Regular bearish: Price makes higher high, RSI makes lower high → reversal down
 * Hidden bullish:  Price makes higher low, RSI makes lower low → trend continuation up
 * Hidden bearish:  Price makes lower high, RSI makes higher high → trend continuation down
 */
export function detectDivergence(candles: Candle[], lookback = 3, maxSpan = 30): DivergenceResult {
  const empty: DivergenceResult = { divergences: [], active: null, signal: 0 };
  if (candles.length < 30) return empty;

  const closes = candles.map(c => c.close);
  const lows = candles.map(c => c.low);
  const highs = candles.map(c => c.high);
  const rsiValues = rsi(closes, 14);

  const priceLows = findSwingLows(lows, lookback);
  const priceHighs = findSwingHighs(highs, lookback);
  const rsiLows = findSwingLows(rsiValues, lookback);
  const rsiHighs = findSwingHighs(rsiValues, lookback);

  const divergences: Divergence[] = [];

  // Check bullish divergences (price lows vs RSI lows)
  for (let i = 1; i < priceLows.length; i++) {
    const curr = priceLows[i];
    const prev = priceLows[i - 1];
    if (curr.index - prev.index > maxSpan) continue;

    // Find corresponding RSI lows near these price pivots
    const rsiAtCurr = findNearestSwing(rsiLows, curr.index, lookback);
    const rsiAtPrev = findNearestSwing(rsiLows, prev.index, lookback);
    if (!rsiAtCurr || !rsiAtPrev) continue;

    // Regular bullish: price lower low, RSI higher low
    if (curr.value < prev.value && rsiAtCurr.value > rsiAtPrev.value) {
      const strength = Math.min(1, Math.abs(rsiAtCurr.value - rsiAtPrev.value) / 15);
      divergences.push({
        type: 'bullish_regular',
        label: 'Bull Div',
        bias: 'bullish',
        index: curr.index,
        startIndex: prev.index,
        strength,
      });
    }

    // Hidden bullish: price higher low, RSI lower low
    if (curr.value > prev.value && rsiAtCurr.value < rsiAtPrev.value) {
      const strength = Math.min(1, Math.abs(rsiAtCurr.value - rsiAtPrev.value) / 15) * 0.7;
      divergences.push({
        type: 'bullish_hidden',
        label: 'H.Bull Div',
        bias: 'bullish',
        index: curr.index,
        startIndex: prev.index,
        strength,
      });
    }
  }

  // Check bearish divergences (price highs vs RSI highs)
  for (let i = 1; i < priceHighs.length; i++) {
    const curr = priceHighs[i];
    const prev = priceHighs[i - 1];
    if (curr.index - prev.index > maxSpan) continue;

    const rsiAtCurr = findNearestSwing(rsiHighs, curr.index, lookback);
    const rsiAtPrev = findNearestSwing(rsiHighs, prev.index, lookback);
    if (!rsiAtCurr || !rsiAtPrev) continue;

    // Regular bearish: price higher high, RSI lower high
    if (curr.value > prev.value && rsiAtCurr.value < rsiAtPrev.value) {
      const strength = Math.min(1, Math.abs(rsiAtCurr.value - rsiAtPrev.value) / 15);
      divergences.push({
        type: 'bearish_regular',
        label: 'Bear Div',
        bias: 'bearish',
        index: curr.index,
        startIndex: prev.index,
        strength,
      });
    }

    // Hidden bearish: price lower high, RSI higher high
    if (curr.value < prev.value && rsiAtCurr.value > rsiAtPrev.value) {
      const strength = Math.min(1, Math.abs(rsiAtCurr.value - rsiAtPrev.value) / 15) * 0.7;
      divergences.push({
        type: 'bearish_hidden',
        label: 'H.Bear Div',
        bias: 'bearish',
        index: curr.index,
        startIndex: prev.index,
        strength,
      });
    }
  }

  // Find the most recent divergence within the last 10 candles
  const recentThreshold = candles.length - 10;
  const active = divergences
    .filter(d => d.index >= recentThreshold)
    .sort((a, b) => b.index - a.index)[0] || null;

  // Signal from active divergence
  let signal = 0;
  if (active) {
    signal = active.bias === 'bullish' ? active.strength : -active.strength;
  }

  return { divergences, active, signal };
}

function findNearestSwing(
  swings: { index: number; value: number }[],
  targetIndex: number,
  tolerance: number
): { index: number; value: number } | null {
  let best: { index: number; value: number } | null = null;
  let bestDist = Infinity;
  for (const s of swings) {
    const dist = Math.abs(s.index - targetIndex);
    if (dist <= tolerance + 2 && dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  return best;
}
