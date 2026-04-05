import type { TradeLevels } from '@/lib/tradeLevels';
import { Target, ShieldAlert, Trophy } from 'lucide-react';

interface TradeLevelsPanelProps {
  levels: TradeLevels | null;
}

export function TradeLevelsPanel({ levels }: TradeLevelsPanelProps) {
  if (!levels) {
    return (
      <div className="terminal-panel">
        <div className="terminal-header py-1.5 px-3">
          <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">TRADE LEVELS</span>
        </div>
        <div className="p-3 text-center">
          <span className="text-[10px] text-muted-foreground font-mono">No active signal</span>
        </div>
      </div>
    );
  }

  const fmt = (p: number) => p.toFixed(p > 100 ? 2 : 4);
  const isLong = levels.direction === 'long';
  const risk = Math.abs(levels.entry - levels.stopLoss);
  const reward = Math.abs(levels.takeProfit - levels.entry);

  return (
    <div className="terminal-panel">
      <div className="terminal-header py-1.5 px-3">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-accent" />
          <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">TRADE LEVELS</span>
        </div>
        <span className={`text-[9px] font-mono font-bold ${isLong ? 'text-bullish' : 'text-bearish'}`}>
          {isLong ? '▲ LONG' : '▼ SHORT'}
        </span>
      </div>
      <div className="p-2.5 space-y-1.5">
        {/* TP */}
        <div className="flex items-center justify-between py-1 border-b border-border/30">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-bullish" />
            <span className="text-[10px] text-muted-foreground font-mono">Take Profit</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-bullish">{fmt(levels.takeProfit)}</span>
        </div>

        {/* Entry */}
        <div className="flex items-center justify-between py-1 border-b border-border/30">
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-accent" />
            <span className="text-[10px] text-muted-foreground font-mono">Entry</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-foreground">{fmt(levels.entry)}</span>
        </div>

        {/* SL */}
        <div className="flex items-center justify-between py-1 border-b border-border/30">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-bearish" />
            <span className="text-[10px] text-muted-foreground font-mono">Stop Loss</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-bearish">{fmt(levels.stopLoss)}</span>
        </div>

        {/* Stats */}
        <div className="pt-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground font-mono">Risk:Reward</span>
            <span className={`text-[10px] font-mono font-bold ${levels.riskReward >= 1.5 ? 'text-bullish' : 'text-bearish'}`}>
              1:{levels.riskReward.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground font-mono">ATR(14)</span>
            <span className="text-[10px] font-mono text-foreground">{fmt(levels.atr)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground font-mono">Risk</span>
            <span className="text-[10px] font-mono text-bearish">{fmt(risk)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground font-mono">Reward</span>
            <span className="text-[10px] font-mono text-bullish">{fmt(reward)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
