import type { Tick } from '@/hooks/useDerivTicks';

export type SpikeMarketType = 'boom' | 'crash' | null;

export interface SpikeEvent {
  epoch: number;
  price: number;
  delta: number;
  ticksSincePrevious: number;
}

export interface SpikeAnalysis {
  marketType: SpikeMarketType;
  expectedInterval: number;            // expected ticks between spikes
  ticksSinceLastSpike: number;
  probability: number;                 // 0–100
  zone: 'safe' | 'warning' | 'danger';
  spikes: SpikeEvent[];                // recent spikes
  meanInterval: number | null;
  minInterval: number | null;
  maxInterval: number | null;
  stdInterval: number | null;
  lastSpike: SpikeEvent | null;
  totalTicks: number;
}

/**
 * Identify Boom/Crash market type & expected spike interval from symbol code.
 * Returns null for non-spike markets.
 */
export function getSpikeMarketInfo(symbol: string | null): { type: SpikeMarketType; interval: number } | null {
  if (!symbol) return null;
  const upper = symbol.toUpperCase();
  // Boom/Crash naming: BOOM300N, BOOM500, BOOM1000, CRASH300N, CRASH500, CRASH1000
  const m = upper.match(/^(BOOM|CRASH)(\d+)/);
  if (!m) return null;
  const type = m[1] === 'BOOM' ? 'boom' : 'crash';
  const interval = parseInt(m[2], 10);
  if (!interval) return null;
  return { type, interval };
}

/**
 * Detect spikes in a tick stream. A spike is a tick whose delta from the previous
 * tick exceeds `spikeMultiplier` × the median absolute delta of recent ticks,
 * AND points in the direction matching the market type.
 */
export function analyzeSpikes(
  ticks: Tick[],
  symbol: string | null,
  spikeMultiplier: number = 8
): SpikeAnalysis {
  const info = getSpikeMarketInfo(symbol);
  const empty: SpikeAnalysis = {
    marketType: info?.type ?? null,
    expectedInterval: info?.interval ?? 0,
    ticksSinceLastSpike: 0,
    probability: 0,
    zone: 'safe',
    spikes: [],
    meanInterval: null,
    minInterval: null,
    maxInterval: null,
    stdInterval: null,
    lastSpike: null,
    totalTicks: ticks.length,
  };

  if (!info || ticks.length < 10) return empty;

  // Compute deltas
  const deltas: number[] = [];
  for (let i = 1; i < ticks.length; i++) {
    deltas.push(ticks[i].quote - ticks[i - 1].quote);
  }

  // Median absolute delta as baseline (robust to outliers)
  const absDeltas = deltas.map(d => Math.abs(d)).sort((a, b) => a - b);
  const median = absDeltas[Math.floor(absDeltas.length / 2)] || 0.0001;
  const threshold = median * spikeMultiplier;

  // Detect spikes
  const spikes: SpikeEvent[] = [];
  let lastSpikeIndex = -1;
  for (let i = 0; i < deltas.length; i++) {
    const d = deltas[i];
    const matchesDirection = info.type === 'boom' ? d > 0 : d < 0;
    if (matchesDirection && Math.abs(d) >= threshold) {
      const ticksSincePrevious = lastSpikeIndex >= 0 ? i - lastSpikeIndex : i + 1;
      spikes.push({
        epoch: ticks[i + 1].epoch,
        price: ticks[i + 1].quote,
        delta: d,
        ticksSincePrevious,
      });
      lastSpikeIndex = i;
    }
  }

  const ticksSinceLastSpike = lastSpikeIndex >= 0 ? deltas.length - 1 - lastSpikeIndex : ticks.length;

  // Stats
  const intervals = spikes.slice(1).map(s => s.ticksSincePrevious).filter(n => n > 0);
  let meanInterval: number | null = null;
  let stdInterval: number | null = null;
  let minInterval: number | null = null;
  let maxInterval: number | null = null;
  if (intervals.length > 0) {
    meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    minInterval = Math.min(...intervals);
    maxInterval = Math.max(...intervals);
    const variance = intervals.reduce((acc, v) => acc + (v - meanInterval!) ** 2, 0) / intervals.length;
    stdInterval = Math.sqrt(variance);
  }

  // Probability — sigmoid-like ramp based on % of expected interval reached
  const ratio = ticksSinceLastSpike / info.interval;
  let probability: number;
  if (ratio < 0.5) probability = ratio * 40;                   // 0-20%
  else if (ratio < 0.9) probability = 20 + (ratio - 0.5) * 125; // 20-70%
  else if (ratio < 1.1) probability = 70 + (ratio - 0.9) * 100; // 70-90%
  else probability = Math.min(99, 90 + (ratio - 1.1) * 30);     // 90-99%
  probability = Math.max(0, Math.min(99, probability));

  let zone: 'safe' | 'warning' | 'danger' = 'safe';
  if (ratio >= 0.9) zone = 'danger';
  else if (ratio >= 0.6) zone = 'warning';

  return {
    marketType: info.type,
    expectedInterval: info.interval,
    ticksSinceLastSpike,
    probability: Math.round(probability),
    zone,
    spikes: spikes.slice(-20),
    meanInterval,
    minInterval,
    maxInterval,
    stdInterval,
    lastSpike: spikes[spikes.length - 1] ?? null,
    totalTicks: ticks.length,
  };
}
