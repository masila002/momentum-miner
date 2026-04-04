import { useMemo } from 'react';
import type { Candle } from '@/lib/indicators';
import type { HMMResult } from '@/lib/hmm';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketPressureProps {
  candles: Candle[];
  hmm: HMMResult | null;
}

interface PressureData {
  buyPressure: number;       // 0-100
  sellPressure: number;      // 0-100
  momentum: number;          // -100 to 100
  volumeProfile: { buy: number; sell: number }[];
  recentBias: 'bullish' | 'bearish' | 'neutral';
  strength: number;          // 0-100
  wickPressure: { upper: number; lower: number };
  bodyRatio: number;         // avg body size vs range
}

function analyzePressure(candles: Candle[]): PressureData | null {
  if (candles.length < 10) return null;

  const recent = candles.slice(-30);

  // Buy/Sell pressure from candle body position within range
  let totalBuy = 0, totalSell = 0;
  const volumeProfile: { buy: number; sell: number }[] = [];

  for (const c of recent) {
    const range = c.high - c.low || 0.0001;
    const bodySize = Math.abs(c.close - c.open);
    const isBullish = c.close >= c.open;

    // Body position: where the close sits relative to the range
    const closePos = (c.close - c.low) / range;
    const openPos = (c.open - c.low) / range;

    // Upper wick = rejection from highs (sell pressure)
    const upperWick = c.high - Math.max(c.open, c.close);
    // Lower wick = rejection from lows (buy pressure)
    const lowerWick = Math.min(c.open, c.close) - c.low;

    const buyScore = (lowerWick / range) * 50 + (isBullish ? (bodySize / range) * 50 : 0);
    const sellScore = (upperWick / range) * 50 + (!isBullish ? (bodySize / range) * 50 : 0);

    totalBuy += buyScore;
    totalSell += sellScore;
    volumeProfile.push({ buy: buyScore, sell: sellScore });
  }

  const total = totalBuy + totalSell || 1;
  const buyPressure = (totalBuy / total) * 100;
  const sellPressure = (totalSell / total) * 100;

  // Momentum: weighted recent candles more
  const last10 = recent.slice(-10);
  let momentum = 0;
  last10.forEach((c, i) => {
    const weight = (i + 1) / 10;
    const change = (c.close - c.open) / (c.high - c.low || 0.0001);
    momentum += change * weight * 20;
  });
  momentum = Math.max(-100, Math.min(100, momentum));

  // Wick analysis
  let totalUpperWick = 0, totalLowerWick = 0;
  for (const c of last10) {
    const range = c.high - c.low || 0.0001;
    totalUpperWick += (c.high - Math.max(c.open, c.close)) / range;
    totalLowerWick += (Math.min(c.open, c.close) - c.low) / range;
  }
  const wickPressure = {
    upper: (totalUpperWick / last10.length) * 100,
    lower: (totalLowerWick / last10.length) * 100,
  };

  // Body ratio
  let bodyRatioSum = 0;
  for (const c of last10) {
    const range = c.high - c.low || 0.0001;
    bodyRatioSum += Math.abs(c.close - c.open) / range;
  }
  const bodyRatio = bodyRatioSum / last10.length;

  const recentBias = momentum > 15 ? 'bullish' : momentum < -15 ? 'bearish' : 'neutral';
  const strength = Math.abs(momentum);

  return { buyPressure, sellPressure, momentum, volumeProfile: volumeProfile.slice(-20), recentBias, strength, wickPressure, bodyRatio };
}

function PressureBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{label}</span>
      <div className="flex-1 h-2 rounded-sm bg-secondary overflow-hidden">
        <div className={`h-full rounded-sm transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{value.toFixed(1)}%</span>
    </div>
  );
}

export function MarketPressure({ candles, hmm }: MarketPressureProps) {
  const pressure = useMemo(() => analyzePressure(candles), [candles]);

  if (!pressure) {
    return (
      <div className="terminal-panel">
        <div className="terminal-header">
          <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">PRESSURE</span>
        </div>
        <div className="p-3 flex items-center justify-center h-32">
          <span className="text-[10px] font-mono text-muted-foreground">Waiting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">MARKET PRESSURE</span>
        <div className="flex items-center gap-1">
          {pressure.recentBias === 'bullish' ? (
            <TrendingUp className="w-3 h-3 text-bullish" />
          ) : pressure.recentBias === 'bearish' ? (
            <TrendingDown className="w-3 h-3 text-bearish" />
          ) : (
            <Minus className="w-3 h-3 text-neutral" />
          )}
        </div>
      </div>
      <div className="p-2.5 space-y-2.5">
        {/* Buy/Sell Pressure Gauge */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-mono text-bullish">BUY {pressure.buyPressure.toFixed(1)}%</span>
            <span className="text-[10px] font-mono text-bearish">SELL {pressure.sellPressure.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-sm overflow-hidden flex">
            <div
              className="h-full bg-bullish/80 transition-all duration-500"
              style={{ width: `${pressure.buyPressure}%` }}
            />
            <div
              className="h-full bg-bearish/80 transition-all duration-500"
              style={{ width: `${pressure.sellPressure}%` }}
            />
          </div>
        </div>

        {/* Momentum Bar */}
        <div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Momentum</span>
          <div className="h-2.5 rounded-sm bg-secondary overflow-hidden mt-1 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/30" />
            <div
              className={`absolute top-0 bottom-0 rounded-sm transition-all duration-500 ${
                pressure.momentum >= 0 ? 'bg-bullish/70' : 'bg-bearish/70'
              }`}
              style={{
                left: pressure.momentum >= 0 ? '50%' : `${50 + pressure.momentum / 2}%`,
                width: `${Math.abs(pressure.momentum) / 2}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] font-mono text-bearish/60">-100</span>
            <span className={`text-[10px] font-mono font-bold ${
              pressure.momentum > 0 ? 'text-bullish' : pressure.momentum < 0 ? 'text-bearish' : 'text-muted-foreground'
            }`}>
              {pressure.momentum > 0 ? '+' : ''}{pressure.momentum.toFixed(1)}
            </span>
            <span className="text-[9px] font-mono text-bullish/60">+100</span>
          </div>
        </div>

        {/* Wick Pressure */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Wick Rejection</span>
          <PressureBar label="UP" value={pressure.wickPressure.upper} max={50} color="bg-bearish/60" />
          <PressureBar label="DN" value={pressure.wickPressure.lower} max={50} color="bg-bullish/60" />
        </div>

        {/* Mini Volume Profile (recent pressure bars) */}
        <div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Pressure Flow</span>
          <div className="flex items-end gap-px mt-1 h-10">
            {pressure.volumeProfile.map((v, i) => {
              const total = v.buy + v.sell || 1;
              const buyPct = (v.buy / total) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col h-full justify-end">
                  <div className="bg-bearish/50 rounded-t-[1px]" style={{ height: `${100 - buyPct}%` }} />
                  <div className="bg-bullish/50 rounded-b-[1px]" style={{ height: `${buyPct}%` }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Body Strength */}
        <div className="flex items-center justify-between border-t border-border/50 pt-2">
          <span className="text-[10px] font-mono text-muted-foreground">Body Strength</span>
          <span className={`text-[10px] font-mono font-bold ${
            pressure.bodyRatio > 0.6 ? 'text-foreground' : pressure.bodyRatio > 0.3 ? 'text-muted-foreground' : 'text-muted-foreground/50'
          }`}>
            {(pressure.bodyRatio * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}