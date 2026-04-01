import { useMemo } from 'react';
import type { Candle } from '@/lib/indicators';
import type { HMMResult } from '@/lib/hmm';

interface CandleChartProps {
  candles: Candle[];
  hmm: HMMResult | null;
}

export function CandleChart({ candles, hmm }: CandleChartProps) {
  const displayCandles = candles.slice(-60);

  const chart = useMemo(() => {
    if (displayCandles.length === 0) return null;

    const width = 800;
    const height = 320;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const highs = displayCandles.map(c => c.high);
    const lows = displayCandles.map(c => c.low);
    const maxPrice = Math.max(...highs);
    const minPrice = Math.min(...lows);
    const priceRange = maxPrice - minPrice || 1;

    const candleW = chartW / displayCandles.length;
    const bodyW = Math.max(candleW * 0.6, 2);

    const yScale = (price: number) =>
      padding.top + chartH - ((price - minPrice) / priceRange) * chartH;

    // Price grid lines
    const gridLines = 5;
    const priceStep = priceRange / gridLines;

    // Map HMM states to candle colors (offset because HMM is on returns, 1 less)
    const hmmStates = hmm?.stateSequence || [];
    const hmmOffset = candles.length - displayCandles.length;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const price = minPrice + priceStep * i;
          const y = yScale(price);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="hsl(220 14% 14%)" strokeWidth={0.5} />
              <text x={width - padding.right + 5} y={y + 4} fill="hsl(215 12% 50%)" fontSize={9} fontFamily="JetBrains Mono">
                {price.toFixed(price > 100 ? 2 : 4)}
              </text>
            </g>
          );
        })}

        {/* Candles */}
        {displayCandles.map((c, i) => {
          const x = padding.left + i * candleW + candleW / 2;
          const isBullish = c.close >= c.open;
          
          // Check HMM regime for subtle background
          const hmmIdx = hmmOffset + i - 1; // -1 because returns are 1 shorter
          const regime = hmmIdx >= 0 && hmmIdx < hmmStates.length ? hmmStates[hmmIdx] : null;

          const color = isBullish ? 'hsl(142, 60%, 45%)' : 'hsl(0, 72%, 55%)';

          return (
            <g key={i}>
              {/* Regime background indicator */}
              {regime && (
                <rect
                  x={padding.left + i * candleW}
                  y={padding.top}
                  width={candleW}
                  height={chartH}
                  fill={
                    regime === 'bullish' ? 'hsl(142, 60%, 45%, 0.03)' :
                    regime === 'bearish' ? 'hsl(0, 72%, 55%, 0.03)' :
                    'transparent'
                  }
                />
              )}
              {/* Wick */}
              <line
                x1={x} y1={yScale(c.high)}
                x2={x} y2={yScale(c.low)}
                stroke={color} strokeWidth={1}
              />
              {/* Body */}
              <rect
                x={x - bodyW / 2}
                y={yScale(Math.max(c.open, c.close))}
                width={bodyW}
                height={Math.max(Math.abs(yScale(c.open) - yScale(c.close)), 1)}
                fill={isBullish ? color : color}
                stroke={color}
                strokeWidth={0.5}
                opacity={isBullish ? 1 : 1}
              />
            </g>
          );
        })}

        {/* Current price line */}
        {displayCandles.length > 0 && (() => {
          const lastPrice = displayCandles[displayCandles.length - 1].close;
          const y = yScale(lastPrice);
          const isBullish = displayCandles[displayCandles.length - 1].close >= displayCandles[displayCandles.length - 1].open;
          return (
            <g>
              <line
                x1={padding.left} y1={y}
                x2={width - padding.right} y2={y}
                stroke={isBullish ? 'hsl(142, 60%, 45%)' : 'hsl(0, 72%, 55%)'}
                strokeWidth={0.5}
                strokeDasharray="4 3"
                opacity={0.6}
              />
            </g>
          );
        })()}
      </svg>
    );
  }, [displayCandles, hmm]);

  return (
    <div className="terminal-panel flex-1">
      <div className="terminal-header">
        <span className="text-sm font-mono font-semibold text-foreground">CHART — {timeframeLabel}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{displayCandles.length} candles</span>
      </div>
      <div className="p-2" style={{ background: 'hsl(220 20% 8%)' }}>
        {chart || (
          <div className="flex items-center justify-center h-[320px] text-xs font-mono text-muted-foreground">
            Connecting to Deriv...
          </div>
        )}
      </div>
    </div>
  );
}
