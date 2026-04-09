import type { Candle, AnalysisResult, SignalLevel } from './indicators';
import { analyzeCandles, ema } from './indicators';
import type { DivergenceResult } from './divergence';

export interface MultiTFSignal {
  /** Per-timeframe analysis results */
  timeframes: { granularity: number; label: string; analysis: AnalysisResult | null }[];
  /** How many timeframes agree on direction */
  agreement: number;
  /** Combined confirmed signal */
  confirmedSignal: SignalLevel;
  /** Combined score averaged across agreeing timeframes */
  confirmedScore: number;
  /** Whether cooldown is active (signal recently changed) */
  cooldownActive: boolean;
  /** Dominant trend direction from higher TF */
  trendDirection: 'up' | 'down' | 'flat';
  /** Divergence warning that may override signal */
  divergenceWarning: DivergenceResult | null;
}

const TF_LABELS: Record<number, string> = {
  60: '1m',
  120: '2m',
  300: '5m',
};

// Minimum timeframes that must agree for a confirmed signal
const MIN_AGREEMENT = 2;

// Cooldown: minimum candles since last signal change before allowing a new signal
const COOLDOWN_CANDLES = 3;

let lastSignal: SignalLevel = 'NEUTRAL';
let candlesSinceChange = 999;

/**
 * Detect dominant trend using EMA 50 slope on the highest available timeframe.
 */
function detectTrend(candles: Candle[]): 'up' | 'down' | 'flat' {
  if (candles.length < 50) return 'flat';
  const closes = candles.map(c => c.close);
  const ema50 = ema(closes, 50);
  const len = ema50.length;
  const current = ema50[len - 1];
  const past = ema50[len - 11] ?? ema50[0];
  const pctChange = (current - past) / past;
  if (pctChange > 0.001) return 'up';
  if (pctChange < -0.001) return 'down';
  return 'flat';
}

/**
 * Analyze multiple timeframes and produce a confirmed signal.
 */
export function analyzeMultiTimeframe(
  candlesByGranularity: Record<number, Candle[]>,
  granularities: number[],
  divergence?: DivergenceResult | null
): MultiTFSignal {
  const timeframes = granularities.map(g => ({
    granularity: g,
    label: TF_LABELS[g] || `${g}s`,
    analysis: candlesByGranularity[g]?.length ? analyzeCandles(candlesByGranularity[g]) : null,
  }));

  let buyCount = 0;
  let sellCount = 0;
  let totalScore = 0;
  let validCount = 0;

  for (const tf of timeframes) {
    if (!tf.analysis) continue;
    validCount++;
    totalScore += tf.analysis.score;
    if (tf.analysis.score >= 20) buyCount++;
    else if (tf.analysis.score <= -20) sellCount++;
  }

  const highestGranularity = Math.max(...granularities);
  const highestCandles = candlesByGranularity[highestGranularity] || [];
  const trendDirection = detectTrend(highestCandles);

  let rawSignal: SignalLevel = 'NEUTRAL';
  let agreement = 0;
  const avgScore = validCount > 0 ? Math.round(totalScore / validCount) : 0;

  if (buyCount >= MIN_AGREEMENT) {
    agreement = buyCount;
    rawSignal = avgScore >= 50 ? 'STRONG_BUY' : 'BUY';
  } else if (sellCount >= MIN_AGREEMENT) {
    agreement = sellCount;
    rawSignal = avgScore <= -50 ? 'STRONG_SELL' : 'SELL';
  } else {
    agreement = Math.max(buyCount, sellCount);
  }

  // Trend filter
  if (trendDirection === 'up' && (rawSignal === 'SELL' || rawSignal === 'STRONG_SELL')) {
    rawSignal = 'NEUTRAL';
  }
  if (trendDirection === 'down' && (rawSignal === 'BUY' || rawSignal === 'STRONG_BUY')) {
    rawSignal = 'NEUTRAL';
  }

  // Divergence filter: downgrade signals that conflict with active divergence
  if (divergence?.active) {
    const divBias = divergence.active.bias;
    if (divBias === 'bearish' && (rawSignal === 'STRONG_BUY' || rawSignal === 'BUY')) {
      rawSignal = rawSignal === 'STRONG_BUY' ? 'BUY' : 'NEUTRAL';
    }
    if (divBias === 'bullish' && (rawSignal === 'STRONG_SELL' || rawSignal === 'SELL')) {
      rawSignal = rawSignal === 'STRONG_SELL' ? 'SELL' : 'NEUTRAL';
    }
  }

  // Cooldown logic
  if (rawSignal !== lastSignal) {
    candlesSinceChange++;
  }
  const cooldownActive = candlesSinceChange < COOLDOWN_CANDLES && rawSignal !== lastSignal;
  
  let confirmedSignal: SignalLevel;
  if (cooldownActive) {
    confirmedSignal = lastSignal;
  } else {
    if (rawSignal !== lastSignal) {
      candlesSinceChange = 0;
    }
    lastSignal = rawSignal;
    confirmedSignal = rawSignal;
  }

  return {
    timeframes,
    agreement,
    confirmedSignal,
    confirmedScore: avgScore,
    cooldownActive,
    trendDirection,
    divergenceWarning: divergence ?? null,
  };
}

/** Reset signal state (call on symbol change) */
export function resetSignalState() {
  lastSignal = 'NEUTRAL';
  candlesSinceChange = 999;
}
