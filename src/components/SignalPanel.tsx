import type { AnalysisResult } from '@/lib/indicators';
import type { HMMResult } from '@/lib/hmm';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';

interface SignalPanelProps {
  analysis: AnalysisResult | null;
  hmm: HMMResult | null;
  currentPrice: number | null;
  symbol: string;
}

function SignalBadge({ signal }: { signal: string }) {
  const classMap: Record<string, string> = {
    STRONG_BUY: 'signal-strong-buy pulse-green',
    BUY: 'signal-buy',
    NEUTRAL: 'signal-neutral',
    SELL: 'signal-sell',
    STRONG_SELL: 'signal-strong-sell pulse-red',
  };
  const labelMap: Record<string, string> = {
    STRONG_BUY: 'STRONG BUY',
    BUY: 'BUY',
    NEUTRAL: 'NEUTRAL',
    SELL: 'SELL',
    STRONG_SELL: 'STRONG SELL',
  };
  return <span className={classMap[signal] || 'signal-neutral'}>{labelMap[signal] || signal}</span>;
}

function IndicatorRow({ label, value, signal }: { label: string; value: string; signal: number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
      <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-foreground">{value}</span>
        {signal > 0.25 ? (
          <TrendingUp className="w-3 h-3 text-bullish" />
        ) : signal < -0.25 ? (
          <TrendingDown className="w-3 h-3 text-bearish" />
        ) : (
          <Minus className="w-3 h-3 text-neutral" />
        )}
      </div>
    </div>
  );
}

function RegimeBadge({ regime }: { regime: string }) {
  const classMap: Record<string, string> = {
    bullish: 'regime-bullish',
    bearish: 'regime-bearish',
    sideways: 'regime-sideways',
  };
  return <span className={classMap[regime] || 'regime-sideways'}>{regime.toUpperCase()}</span>;
}

export function SignalPanel({ analysis, hmm, currentPrice, symbol }: SignalPanelProps) {
  return (
    <div className="space-y-1.5">
      {/* Signal + Price */}
      <div className="terminal-panel">
        <div className="terminal-header py-1.5 px-3">
          <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">SIGNAL</span>
          <span className="text-[9px] font-mono text-muted-foreground">{symbol}</span>
        </div>
        <div className="p-3 text-center space-y-2">
          {currentPrice !== null && (
            <div className="text-xl font-mono font-bold text-foreground tracking-tight">
              {currentPrice.toFixed(currentPrice > 100 ? 2 : 4)}
            </div>
          )}
          {analysis ? (
            <>
              <SignalBadge signal={analysis.signal} />
              <div className="flex items-center justify-center gap-2">
                <span className="text-[9px] text-muted-foreground font-mono">SCORE</span>
                <span className={`text-xs font-mono font-bold ${
                  analysis.score > 0 ? 'text-bullish' : analysis.score < 0 ? 'text-bearish' : 'text-neutral'
                }`}>
                  {analysis.score > 0 ? '+' : ''}{analysis.score}
                </span>
              </div>
            </>
          ) : (
            <div className="text-[10px] text-muted-foreground font-mono">Loading...</div>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="terminal-panel">
        <div className="terminal-header py-1.5 px-3">
          <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">INDICATORS</span>
        </div>
        <div className="p-2.5">
          {analysis ? (
            <>
              <IndicatorRow label="RSI(14)" value={isNaN(analysis.rsiValue) ? '--' : analysis.rsiValue.toFixed(1)} signal={analysis.rsiSignal} />
              <IndicatorRow label="MACD" value={analysis.macdSignal > 0 ? 'Bull' : analysis.macdSignal < 0 ? 'Bear' : 'Flat'} signal={analysis.macdSignal} />
              <IndicatorRow label="BBands" value={analysis.bbSignal > 0 ? 'OS' : analysis.bbSignal < 0 ? 'OB' : 'Mid'} signal={analysis.bbSignal} />
              <IndicatorRow label="EMA 9/21" value={analysis.emaSignal > 0 ? '↑ Cross' : analysis.emaSignal < 0 ? '↓ Cross' : '—'} signal={analysis.emaSignal} />
            </>
          ) : (
            <div className="text-[10px] text-muted-foreground font-mono py-3 text-center">Waiting...</div>
          )}
        </div>
      </div>

      {/* HMM Regime */}
      <div className="terminal-panel">
        <div className="terminal-header py-1.5 px-3">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-accent" />
            <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">HMM</span>
          </div>
        </div>
        <div className="p-2.5 space-y-2">
          {hmm ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">Regime</span>
                <RegimeBadge regime={hmm.regime} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">Conf.</span>
                <span className="text-[10px] font-mono text-foreground">{(hmm.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="space-y-1">
                {(['bullish', 'sideways', 'bearish'] as const).map(state => (
                  <div key={state} className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-muted-foreground w-10 capitalize">{state.slice(0, 4)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          state === 'bullish' ? 'bg-bullish' : state === 'bearish' ? 'bg-bearish' : 'bg-neutral'
                        }`}
                        style={{ width: `${hmm.probabilities[state] * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground w-8 text-right">
                      {(hmm.probabilities[state] * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[10px] text-muted-foreground font-mono py-2 text-center">Training...</div>
          )}
        </div>
      </div>
    </div>
  );
}