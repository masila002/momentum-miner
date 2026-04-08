import type { PriceActionResult } from '@/lib/priceAction';
import { TrendingUp, TrendingDown, Minus, Crosshair, BarChart3, Layers } from 'lucide-react';

interface PriceActionPanelProps {
  priceAction: PriceActionResult | null;
}

function TrendBadge({ trend }: { trend: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    uptrend: { cls: 'text-bullish', label: '▲ UPTREND' },
    downtrend: { cls: 'text-bearish', label: '▼ DOWNTREND' },
    ranging: { cls: 'text-neutral', label: '◆ RANGING' },
  };
  const info = map[trend] || map.ranging;
  return <span className={`text-[9px] font-mono font-bold ${info.cls}`}>{info.label}</span>;
}

function PatternBias({ bias }: { bias: string }) {
  if (bias === 'bullish') return <TrendingUp className="w-3 h-3 text-bullish" />;
  if (bias === 'bearish') return <TrendingDown className="w-3 h-3 text-bearish" />;
  return <Minus className="w-3 h-3 text-neutral" />;
}

export function PriceActionPanel({ priceAction }: PriceActionPanelProps) {
  if (!priceAction) {
    return (
      <div className="terminal-panel">
        <div className="terminal-header py-1.5 px-3">
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-3 h-3 text-accent" />
            <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">PRICE ACTION</span>
          </div>
        </div>
        <div className="p-2.5">
          <div className="text-[10px] text-muted-foreground font-mono py-2 text-center">Waiting...</div>
        </div>
      </div>
    );
  }

  const recentPatterns = priceAction.patterns.slice(-4);

  return (
    <div className="terminal-panel">
      <div className="terminal-header py-1.5 px-3">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3 h-3 text-accent" />
          <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">PRICE ACTION</span>
        </div>
        <span className={`text-[9px] font-mono font-bold ${
          priceAction.signal > 0.3 ? 'text-bullish' : priceAction.signal < -0.3 ? 'text-bearish' : 'text-neutral'
        }`}>
          {priceAction.signal > 0 ? '+' : ''}{priceAction.signal.toFixed(2)}
        </span>
      </div>
      <div className="p-2.5 space-y-2">
        {/* Structure */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-mono">Structure</span>
          </div>
          <TrendBadge trend={priceAction.structure.trend} />
        </div>

        {/* Recent swing points */}
        {priceAction.structure.swings.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {priceAction.structure.swings.slice(-4).map((s, i) => (
              <span key={i} className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                s.type === 'HH' || s.type === 'HL' 
                  ? 'bg-bullish/10 text-bullish' 
                  : 'bg-bearish/10 text-bearish'
              }`}>
                {s.type}
              </span>
            ))}
          </div>
        )}

        {/* Patterns */}
        {recentPatterns.length > 0 && (
          <>
            <div className="w-full h-px bg-border/30" />
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[9px] text-muted-foreground font-mono">PATTERNS</span>
            </div>
            {recentPatterns.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-0.5">
                <span className="text-[9px] font-mono text-muted-foreground">{p.label}</span>
                <PatternBias bias={p.bias} />
              </div>
            ))}
          </>
        )}

        {/* S/R Levels */}
        {priceAction.srLevels.length > 0 && (
          <>
            <div className="w-full h-px bg-border/30" />
            <div className="flex items-center gap-1 mb-1">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground font-mono">S/R LEVELS</span>
            </div>
            {priceAction.srLevels.map((sr, i) => (
              <div key={i} className="flex items-center justify-between py-0.5">
                <span className={`text-[9px] font-mono ${
                  sr.type === 'support' ? 'text-bullish' : 'text-bearish'
                }`}>
                  {sr.type === 'support' ? 'S' : 'R'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-foreground">
                    {sr.price.toFixed(sr.price > 100 ? 2 : 4)}
                  </span>
                  <span className="text-[8px] font-mono text-muted-foreground">×{sr.strength}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
