export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// EMA
export function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

// SMA
export function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

// RSI
export function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

// MACD
export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

// Bollinger Bands
export function bollingerBands(closes: number[], period = 20, stdDev = 2) {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
      const sd = Math.sqrt(variance) * stdDev;
      upper.push(mean + sd);
      lower.push(mean - sd);
    }
  }
  return { upper, middle, lower };
}

// Combined signal score: -100 to 100
export type SignalLevel = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export interface AnalysisResult {
  rsiValue: number;
  rsiSignal: number; // -1 to 1
  macdSignal: number;
  bbSignal: number;
  emaSignal: number;
  score: number; // -100 to 100
  signal: SignalLevel;
}

export function analyzeCandles(candles: Candle[]): AnalysisResult | null {
  if (candles.length < 30) return null;

  const closes = candles.map(c => c.close);
  const len = closes.length;

  // RSI
  const rsiValues = rsi(closes, 14);
  const currentRSI = rsiValues[len - 1];
  let rsiSig = 0;
  if (!isNaN(currentRSI)) {
    if (currentRSI > 70) rsiSig = -1;
    else if (currentRSI > 60) rsiSig = -0.5;
    else if (currentRSI < 30) rsiSig = 1;
    else if (currentRSI < 40) rsiSig = 0.5;
  }

  // MACD
  const { macdLine, signalLine, histogram } = macd(closes);
  let macdSig = 0;
  const h = histogram[len - 1];
  const hPrev = histogram[len - 2];
  if (h > 0 && h > hPrev) macdSig = 1;
  else if (h > 0) macdSig = 0.5;
  else if (h < 0 && h < hPrev) macdSig = -1;
  else if (h < 0) macdSig = -0.5;

  // Bollinger
  const bb = bollingerBands(closes);
  let bbSig = 0;
  const price = closes[len - 1];
  const upper = bb.upper[len - 1];
  const lower = bb.lower[len - 1];
  const mid = bb.middle[len - 1];
  if (!isNaN(upper)) {
    const range = upper - lower;
    if (range > 0) {
      const pos = (price - lower) / range;
      if (pos > 0.9) bbSig = -1;
      else if (pos > 0.7) bbSig = -0.5;
      else if (pos < 0.1) bbSig = 1;
      else if (pos < 0.3) bbSig = 0.5;
    }
  }

  // EMA crossover (9 vs 21)
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  let emaSig = 0;
  const diff = ema9[len - 1] - ema21[len - 1];
  const diffPrev = ema9[len - 2] - ema21[len - 2];
  if (diff > 0 && diffPrev <= 0) emaSig = 1;
  else if (diff > 0) emaSig = 0.5;
  else if (diff < 0 && diffPrev >= 0) emaSig = -1;
  else if (diff < 0) emaSig = -0.5;

  // Weighted score
  const score = Math.round(
    (rsiSig * 25 + macdSig * 30 + bbSig * 20 + emaSig * 25)
  );

  let signal: SignalLevel = 'NEUTRAL';
  if (score >= 50) signal = 'STRONG_BUY';
  else if (score >= 20) signal = 'BUY';
  else if (score <= -50) signal = 'STRONG_SELL';
  else if (score <= -20) signal = 'SELL';

  return {
    rsiValue: currentRSI,
    rsiSignal: rsiSig,
    macdSignal: macdSig,
    bbSignal: bbSig,
    emaSignal: emaSig,
    score,
    signal,
  };
}
