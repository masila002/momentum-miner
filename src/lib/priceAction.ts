import type { Candle } from '@/lib/indicators';

/* ── Candlestick Patterns ─────────────────────────── */

export type PatternType =
  | 'doji'
  | 'hammer'
  | 'shooting_star'
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'morning_star'
  | 'evening_star';

export interface CandlePattern {
  index: number;
  type: PatternType;
  label: string;
  bias: 'bullish' | 'bearish' | 'neutral';
}

function bodySize(c: Candle) {
  return Math.abs(c.close - c.open);
}
function range(c: Candle) {
  return c.high - c.low || 0.0001;
}
function isBullish(c: Candle) {
  return c.close > c.open;
}
function upperWick(c: Candle) {
  return c.high - Math.max(c.open, c.close);
}
function lowerWick(c: Candle) {
  return Math.min(c.open, c.close) - c.low;
}

export function detectPatterns(candles: Candle[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];
  if (candles.length < 3) return patterns;

  for (let i = 2; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];
    const body = bodySize(c);
    const r = range(c);
    const ratio = body / r;

    // Doji — tiny body relative to range
    if (ratio < 0.1) {
      patterns.push({ index: i, type: 'doji', label: 'Doji', bias: 'neutral' });
      continue;
    }

    // Hammer — small body at top, long lower wick
    if (lowerWick(c) > body * 2 && upperWick(c) < body * 0.5) {
      patterns.push({ index: i, type: 'hammer', label: 'Hammer', bias: 'bullish' });
      continue;
    }

    // Shooting Star — small body at bottom, long upper wick
    if (upperWick(c) > body * 2 && lowerWick(c) < body * 0.5) {
      patterns.push({ index: i, type: 'shooting_star', label: 'Shoot★', bias: 'bearish' });
      continue;
    }

    // Bullish Engulfing
    if (!isBullish(prev) && isBullish(c) && c.open <= prev.close && c.close >= prev.open && body > bodySize(prev)) {
      patterns.push({ index: i, type: 'bullish_engulfing', label: 'Bull Eng', bias: 'bullish' });
      continue;
    }

    // Bearish Engulfing
    if (isBullish(prev) && !isBullish(c) && c.open >= prev.close && c.close <= prev.open && body > bodySize(prev)) {
      patterns.push({ index: i, type: 'bearish_engulfing', label: 'Bear Eng', bias: 'bearish' });
      continue;
    }

    // Morning Star (3-candle)
    if (!isBullish(prev2) && bodySize(prev) / range(prev) < 0.3 && isBullish(c) && c.close > (prev2.open + prev2.close) / 2) {
      patterns.push({ index: i, type: 'morning_star', label: 'Morn★', bias: 'bullish' });
      continue;
    }

    // Evening Star (3-candle)
    if (isBullish(prev2) && bodySize(prev) / range(prev) < 0.3 && !isBullish(c) && c.close < (prev2.open + prev2.close) / 2) {
      patterns.push({ index: i, type: 'evening_star', label: 'Eve★', bias: 'bearish' });
      continue;
    }
  }
  return patterns;
}

/* ── Price Structure (HH/HL/LH/LL) ───────────────── */

export type SwingType = 'HH' | 'HL' | 'LH' | 'LL';
export type TrendStructure = 'uptrend' | 'downtrend' | 'ranging';

export interface SwingPoint {
  index: number;
  price: number;
  type: SwingType;
}

export interface StructureResult {
  swings: SwingPoint[];
  trend: TrendStructure;
}

export function analyzePriceStructure(candles: Candle[], lookback = 5): StructureResult {
  const swings: SwingPoint[] = [];
  if (candles.length < lookback * 2 + 1) return { swings, trend: 'ranging' };

  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];

  // Find swing highs and lows
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }
    if (isHigh) swingHighs.push({ index: i, price: candles[i].high });
    if (isLow) swingLows.push({ index: i, price: candles[i].low });
  }

  // Classify swing highs
  for (let i = 1; i < swingHighs.length; i++) {
    const type: SwingType = swingHighs[i].price > swingHighs[i - 1].price ? 'HH' : 'LH';
    swings.push({ index: swingHighs[i].index, price: swingHighs[i].price, type });
  }

  // Classify swing lows
  for (let i = 1; i < swingLows.length; i++) {
    const type: SwingType = swingLows[i].price > swingLows[i - 1].price ? 'HL' : 'LL';
    swings.push({ index: swingLows[i].index, price: swingLows[i].price, type });
  }

  swings.sort((a, b) => a.index - b.index);

  // Determine trend from recent swings
  const recent = swings.slice(-6);
  const hhCount = recent.filter(s => s.type === 'HH' || s.type === 'HL').length;
  const llCount = recent.filter(s => s.type === 'LH' || s.type === 'LL').length;

  let trend: TrendStructure = 'ranging';
  if (hhCount >= 4) trend = 'uptrend';
  else if (llCount >= 4) trend = 'downtrend';

  return { swings, trend };
}

/* ── Support & Resistance ─────────────────────────── */

export interface SRLevel {
  price: number;
  strength: number; // how many touches
  type: 'support' | 'resistance';
}

export function detectSupportResistance(candles: Candle[], zones = 4, tolerance?: number): SRLevel[] {
  if (candles.length < 20) return [];

  const currentPrice = candles[candles.length - 1].close;
  const prices = candles.flatMap(c => [c.high, c.low]);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const tol = tolerance ?? avg * 0.002; // 0.2% tolerance

  // Cluster nearby price levels
  const clusters: { price: number; count: number }[] = [];

  for (const p of prices) {
    const existing = clusters.find(c => Math.abs(c.price - p) < tol);
    if (existing) {
      existing.price = (existing.price * existing.count + p) / (existing.count + 1);
      existing.count++;
    } else {
      clusters.push({ price: p, count: 1 });
    }
  }

  // Sort by strength (touch count)
  clusters.sort((a, b) => b.count - a.count);

  // Take top levels and classify as support/resistance
  return clusters
    .slice(0, zones * 2)
    .map(c => ({
      price: c.price,
      strength: c.count,
      type: c.price < currentPrice ? 'support' as const : 'resistance' as const,
    }))
    .sort((a, b) => b.price - a.price)
    .slice(0, zones);
}

/* ── Combined Price Action Signal ─────────────────── */

export interface PriceActionResult {
  patterns: CandlePattern[];
  structure: StructureResult;
  srLevels: SRLevel[];
  signal: number; // -1 to 1
  label: string;
}

export function analyzePriceAction(candles: Candle[]): PriceActionResult | null {
  if (candles.length < 30) return null;

  const patterns = detectPatterns(candles);
  const structure = analyzePriceStructure(candles);
  const srLevels = detectSupportResistance(candles);

  // Score from recent patterns (last 5 candles)
  const recentPatterns = patterns.filter(p => p.index >= candles.length - 5);
  let patternScore = 0;
  for (const p of recentPatterns) {
    if (p.bias === 'bullish') patternScore += 0.3;
    else if (p.bias === 'bearish') patternScore -= 0.3;
  }

  // Score from structure
  let structureScore = 0;
  if (structure.trend === 'uptrend') structureScore = 0.4;
  else if (structure.trend === 'downtrend') structureScore = -0.4;

  // Score from S/R proximity
  const price = candles[candles.length - 1].close;
  let srScore = 0;
  for (const sr of srLevels) {
    const dist = Math.abs(price - sr.price) / price;
    if (dist < 0.003) { // within 0.3%
      srScore += sr.type === 'support' ? 0.2 : -0.2;
    }
  }

  const signal = Math.max(-1, Math.min(1, patternScore + structureScore + srScore));

  let label = 'Neutral';
  if (signal > 0.3) label = 'Bullish PA';
  else if (signal < -0.3) label = 'Bearish PA';

  return { patterns, structure, srLevels, signal, label };
}
