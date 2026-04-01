import type { AnalysisResult } from '@/lib/indicators';
import type { HMMResult } from '@/lib/hmm';
import { TrendingUp, TrendingDown, Minus, Activity, Brain } from 'lucide-react';

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
    STRONG_BUY: 'Strong Buy',
    BUY: 'Buy',
    NEUTRAL: 'Neutral',
    SELL: 'Sell',
    STRONG_SELL: 'Strong Sell',
  };
  return <span className={classMap[signal] || 'signal-neutral'}>{labelMap[signal] || signal}</span>;
}

function IndicatorRow({ label, value, signal }: { label: string; value: string; signal: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-foreground">{value}</span>
        {signal > 0.25 ? (
          <TrendingUp className="w-3.5 h-3.5 text-bullish" />
        ) : signal < -0.25 ? (
          <TrendingDown className="w-3.5 h-3.5 text-bearish" />
        ) : (
          <Minus className="w-3.5 h-3.5 text-neutral" />
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
    <div className="space-y-3">
      {/* Main Signal */}
      <div className="terminal-panel">
        <div className="terminal-header">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono font-semibold text-foreground">SIGNAL</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{symbol}</span>
        </div>
        <div className="p-4 text-center space-y-3">
          {currentPrice !== null && (
            <div className="text-2xl font-mono font-bold text-foreground">
              {currentPrice.toFixed(currentPrice > 100 ? 2 : 4)}
            </div>
          )}
          {analysis ? (
            <>
              <SignalBadge signal={analysis.signal} />
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground font-mono">Score:</span>
                <span className={`text-sm font-mono font-bold ${
                  analysis.score > 0 ? 'text-bullish' : analysis.score < 0 ? 'text-bearish' : 'text-neutral'
                }`}>
                  {analysis.score > 0 ? '+' : ''}{analysis.score}
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground font-mono">Loading data...</div>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="terminal-panel">
        <div className="terminal-header">
          <span className="text-sm font-mono font-semibold text-foreground">INDICATORS</span>
        </div>
        <div className="p-3">
          {analysis ? (
            <>
              <IndicatorRow label="RSI (14)" value={isNaN(analysis.rsiValue) ? '--' : analysis.rsiValue.toFixed(1)} signal={analysis.rsiSignal} />
              <IndicatorRow label="MACD" value={analysis.macdSignal > 0 ? 'Bullish' : analysis.macdSignal < 0 ? 'Bearish' : 'Flat'} signal={analysis.macdSignal} />
              <IndicatorRow label="Bollinger" value={analysis.bbSignal > 0 ? 'Oversold' : analysis.bbSignal < 0 ? 'Overbought' : 'Mid'} signal={analysis.bbSignal} />
              <IndicatorRow label="EMA 9/21" value={analysis.emaSignal > 0 ? 'Cross Up' : analysis.emaSignal < 0 ? 'Cross Down' : 'Aligned'} signal={analysis.emaSignal} />
            </>
          ) : (
            <div className="text-xs text-muted-foreground font-mono py-4 text-center">Waiting for data...</div>
          )}
        </div>
      </div>

      {/* HMM */}
      <div className="terminal-panel">
        <div className="terminal-header">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" />
            <span className="text-sm font-mono font-semibold text-foreground">HMM REGIME</span>
          </div>
        </div>
        <div className="p-3 space-y-3">
          {hmm ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">Current Regime</span>
                <RegimeBadge regime={hmm.regime} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">Confidence</span>
                <span className="text-xs font-mono text-foreground">{(hmm.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">State Probabilities</span>
                {(['bullish', 'sideways', 'bearish'] as const).map(state => (
                  <div key={state} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground w-14 capitalize">{state}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          state === 'bullish' ? 'bg-bullish' : state === 'bearish' ? 'bg-bearish' : 'bg-neutral'
                        }`}
                        style={{ width: `${hmm.probabilities[state] * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                      {(hmm.probabilities[state] * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground font-mono py-4 text-center">Training model...</div>
          )}
        </div>
      </div>
    </div>
  );
}
