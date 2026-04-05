import { useMemo } from 'react';
import type { Candle } from '@/lib/indicators';
import type { HMMResult } from '@/lib/hmm';
import type { TradeLevels } from '@/lib/tradeLevels';

interface CandleChartProps {
  candles: Candle[];
  hmm: HMMResult | null;
  timeframeLabel?: string;
  tradeLevels?: TradeLevels | null;
}

export function CandleChart({ candles, hmm, timeframeLabel = '1M', tradeLevels }: CandleChartProps) {
  const displayCandles = candles.slice(-80);

  const chart = useMemo(() => {
    if (displayCandles.length === 0) return null;

    const width = 900;
    const height = 340;
    const volumeHeight = 50;
    const totalHeight = height + volumeHeight;
    const padding = { top: 12, right: 55, bottom: 2, left: 5 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const highs = displayCandles.map(c => c.high);
    const lows = displayCandles.map(c => c.low);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);

    // Expand range to include trade levels if present
    if (tradeLevels) {
      maxPrice = Math.max(maxPrice, tradeLevels.takeProfit, tradeLevels.stopLoss, tradeLevels.entry);
      minPrice = Math.min(minPrice, tradeLevels.takeProfit, tradeLevels.stopLoss, tradeLevels.entry);
    }

    const priceRange = maxPrice - minPrice || 1;
    const candleW = chartW / displayCandles.length;
    const bodyW = Math.max(candleW * 0.65, 2);
    const gap = Math.max(candleW * 0.05, 0.5);

    const yScale = (price: number) =>
      padding.top + chartH - ((price - minPrice) / priceRange) * chartH;

    const gridLines = 6;
    const priceStep = priceRange / gridLines;

    const hmmStates = hmm?.stateSequence || [];
    const hmmOffset = candles.length - displayCandles.length;

    const ranges = displayCandles.map(c => c.high - c.low);
    const maxRange = Math.max(...ranges) || 1;

    const fmt = (p: number) => p.toFixed(p > 100 ? 2 : 4);

    return (
      <svg viewBox={`0 0 ${width} ${totalHeight}`} className="w-full h-full" style={{ display: 'block' }}>
        {/* Background */}
        <rect x={0} y={0} width={width} height={totalHeight} fill="hsl(220, 20%, 6%)" />

        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const price = minPrice + priceStep * i;
          const y = yScale(price);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                stroke="hsl(220, 14%, 12%)" strokeWidth={0.5} />
              <text x={width - padding.right + 4} y={y + 3}
                fill="hsl(215, 12%, 40%)" fontSize={8} fontFamily="JetBrains Mono, monospace">
                {fmt(price)}
              </text>
            </g>
          );
        })}

        {/* Regime background strips */}
        {displayCandles.map((_, i) => {
          const hmmIdx = hmmOffset + i - 1;
          const regime = hmmIdx >= 0 && hmmIdx < hmmStates.length ? hmmStates[hmmIdx] : null;
          if (!regime || regime === 'sideways') return null;
          return (
            <rect key={`r${i}`}
              x={padding.left + i * candleW}
              y={padding.top}
              width={candleW}
              height={chartH}
              fill={regime === 'bullish' ? 'hsl(142, 60%, 45%, 0.04)' : 'hsl(0, 72%, 55%, 0.04)'}
            />
          );
        })}

        {/* Trade level zones (SL to TP shading) */}
        {tradeLevels && (() => {
          const tpY = yScale(tradeLevels.takeProfit);
          const slY = yScale(tradeLevels.stopLoss);
          const entryY = yScale(tradeLevels.entry);
          const isLong = tradeLevels.direction === 'long';

          return (
            <g>
              {/* TP zone */}
              <rect
                x={padding.left} 
                y={Math.min(entryY, tpY)}
                width={chartW}
                height={Math.abs(tpY - entryY)}
                fill={isLong ? 'hsl(142, 60%, 45%, 0.06)' : 'hsl(0, 72%, 55%, 0.06)'}
              />
              {/* SL zone */}
              <rect
                x={padding.left}
                y={Math.min(entryY, slY)}
                width={chartW}
                height={Math.abs(slY - entryY)}
                fill={isLong ? 'hsl(0, 72%, 55%, 0.06)' : 'hsl(142, 60%, 45%, 0.06)'}
              />
            </g>
          );
        })()}

        {/* Candles */}
        {displayCandles.map((c, i) => {
          const x = padding.left + i * candleW + candleW / 2;
          const isBullish = c.close >= c.open;
          const color = isBullish ? 'hsl(142, 60%, 50%)' : 'hsl(0, 72%, 55%)';
          return (
            <g key={i}>
              <line x1={x} y1={yScale(c.high)} x2={x} y2={yScale(c.low)}
                stroke={color} strokeWidth={0.8} />
              <rect
                x={x - bodyW / 2 + gap / 2}
                y={yScale(Math.max(c.open, c.close))}
                width={bodyW - gap}
                height={Math.max(Math.abs(yScale(c.open) - yScale(c.close)), 1)}
                fill={color}
                rx={0.5}
              />
            </g>
          );
        })}

        {/* Trade level lines: TP, Entry, SL */}
        {tradeLevels && (() => {
          const levels = [
            { price: tradeLevels.takeProfit, label: 'TP', color: 'hsl(142, 70%, 50%)', dash: '6 3' },
            { price: tradeLevels.entry, label: 'ENTRY', color: 'hsl(45, 90%, 55%)', dash: '4 2' },
            { price: tradeLevels.stopLoss, label: 'SL', color: 'hsl(0, 80%, 55%)', dash: '6 3' },
          ];
          return levels.map(({ price, label, color, dash }) => {
            const y = yScale(price);
            if (y < padding.top || y > height) return null;
            return (
              <g key={label}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                  stroke={color} strokeWidth={0.8} strokeDasharray={dash} opacity={0.9} />
                {/* Label on left */}
                <rect x={padding.left} y={y - 7} width={28} height={14}
                  fill={color} rx={2} opacity={0.9} />
                <text x={padding.left + 14} y={y + 3}
                  fill="hsl(220, 20%, 7%)" fontSize={7} fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle" fontWeight="bold">
                  {label}
                </text>
                {/* Price on right */}
                <rect x={width - padding.right} y={y - 7} width={54} height={14}
                  fill={color} rx={2} opacity={0.85} />
                <text x={width - padding.right + 27} y={y + 3}
                  fill="hsl(220, 20%, 7%)" fontSize={8} fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle" fontWeight="bold">
                  {fmt(price)}
                </text>
              </g>
            );
          });
        })()}

        {/* Current price dashed line + label (on top) */}
        {displayCandles.length > 0 && !tradeLevels && (() => {
          const last = displayCandles[displayCandles.length - 1];
          const y = yScale(last.close);
          const isBullish = last.close >= last.open;
          const color = isBullish ? 'hsl(142, 60%, 50%)' : 'hsl(0, 72%, 55%)';
          return (
            <g>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                stroke={color} strokeWidth={0.7} strokeDasharray="3 2" opacity={0.8} />
              <rect x={width - padding.right} y={y - 7} width={54} height={14}
                fill={color} rx={2} />
              <text x={width - padding.right + 27} y={y + 3}
                fill="hsl(220, 20%, 7%)" fontSize={8} fontFamily="JetBrains Mono, monospace"
                textAnchor="middle" fontWeight="bold">
                {fmt(last.close)}
              </text>
            </g>
          );
        })()}

        {/* Volume bars */}
        <line x1={padding.left} y1={height} x2={width - padding.right} y2={height}
          stroke="hsl(220, 14%, 15%)" strokeWidth={0.5} />
        {displayCandles.map((c, i) => {
          const x = padding.left + i * candleW + candleW / 2;
          const range = c.high - c.low;
          const barH = (range / maxRange) * (volumeHeight - 4);
          const isBullish = c.close >= c.open;
          return (
            <rect key={`v${i}`}
              x={x - bodyW / 2 + gap / 2}
              y={height + volumeHeight - barH - 2}
              width={bodyW - gap}
              height={barH}
              fill={isBullish ? 'hsl(142, 60%, 45%, 0.35)' : 'hsl(0, 72%, 55%, 0.35)'}
              rx={0.5}
            />
          );
        })}
      </svg>
    );
  }, [displayCandles, hmm, tradeLevels]);

  return (
    <div className="terminal-panel flex-1 flex flex-col">
      <div className="terminal-header py-1.5 px-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-foreground">{timeframeLabel}</span>
          <span className="text-[9px] font-mono text-muted-foreground/50">OHLC</span>
          {tradeLevels && (
            <>
              <div className="w-px h-3 bg-border" />
              <span className="text-[9px] font-mono text-accent">{tradeLevels.direction?.toUpperCase()} • R:R {tradeLevels.riskReward.toFixed(1)}</span>
            </>
          )}
        </div>
        <span className="text-[9px] font-mono text-muted-foreground">{displayCandles.length} bars</span>
      </div>
      <div className="flex-1 min-h-0">
        {chart || (
          <div className="flex items-center justify-center h-full min-h-[200px] text-[10px] font-mono text-muted-foreground">
            Connecting to Deriv...
          </div>
        )}
      </div>
    </div>
  );
}
