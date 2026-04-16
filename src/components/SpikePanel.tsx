import type { SpikeAnalysis } from '@/lib/spikeDetector';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Zap, AlertTriangle } from 'lucide-react';

interface SpikePanelProps {
  analysis: SpikeAnalysis;
  connected: boolean;
}

export function SpikePanel({ analysis, connected }: SpikePanelProps) {
  if (!analysis.marketType) return null;

  const isBoom = analysis.marketType === 'boom';
  const Icon = isBoom ? TrendingUp : TrendingDown;
  const dirLabel = isBoom ? 'UP SPIKE' : 'DOWN SPIKE';

  const zoneColor =
    analysis.zone === 'danger' ? 'text-destructive' :
    analysis.zone === 'warning' ? 'text-yellow-400' :
    'text-emerald-400';

  const zoneBg =
    analysis.zone === 'danger' ? 'bg-destructive/15 border-destructive/40' :
    analysis.zone === 'warning' ? 'bg-yellow-400/10 border-yellow-400/30' :
    'bg-emerald-400/10 border-emerald-400/20';

  const zoneLabel =
    analysis.zone === 'danger' ? 'IMMINENT' :
    analysis.zone === 'warning' ? 'APPROACHING' :
    'SAFE';

  return (
    <div className="terminal-panel">
      <div className="terminal-header py-1 px-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-mono font-semibold tracking-wider">SPIKE DETECTOR</span>
        </div>
        <span className={cn(
          'text-[8px] font-mono',
          connected ? 'text-emerald-400' : 'text-muted-foreground'
        )}>
          {connected ? '● TICKS' : '○ OFF'}
        </span>
      </div>

      <div className="p-2 space-y-2">
        {/* Direction badge */}
        <div className={cn('flex items-center justify-between px-2 py-1 rounded-sm border', zoneBg)}>
          <div className="flex items-center gap-1.5">
            <Icon className={cn('h-3 w-3', zoneColor)} />
            <span className={cn('text-[10px] font-mono font-bold tracking-wider', zoneColor)}>
              {dirLabel}
            </span>
          </div>
          <span className={cn('text-[9px] font-mono font-bold', zoneColor)}>{zoneLabel}</span>
        </div>

        {/* Probability gauge */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Probability</span>
            <span className={cn('text-[10px] font-mono font-bold', zoneColor)}>
              {analysis.probability}%
            </span>
          </div>
          <div className="h-1.5 bg-secondary/40 rounded-sm overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                analysis.zone === 'danger' ? 'bg-destructive' :
                analysis.zone === 'warning' ? 'bg-yellow-400' :
                'bg-emerald-400'
              )}
              style={{ width: `${analysis.probability}%` }}
            />
          </div>
        </div>

        {/* Tick countdown */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-secondary/20 border border-border/40 rounded-sm px-2 py-1">
            <div className="text-[8px] font-mono uppercase text-muted-foreground/70">Ticks since</div>
            <div className="text-[12px] font-mono font-bold text-foreground tabular-nums">
              {analysis.ticksSinceLastSpike}
            </div>
          </div>
          <div className="bg-secondary/20 border border-border/40 rounded-sm px-2 py-1">
            <div className="text-[8px] font-mono uppercase text-muted-foreground/70">Expected</div>
            <div className="text-[12px] font-mono font-bold text-foreground tabular-nums">
              ~{analysis.expectedInterval}
            </div>
          </div>
        </div>

        {/* Stats */}
        {analysis.meanInterval !== null && (
          <div className="border-t border-border/40 pt-1.5">
            <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              Observed Intervals ({analysis.spikes.length})
            </div>
            <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
              <div className="text-center">
                <div className="text-muted-foreground/60 text-[7px] uppercase">Mean</div>
                <div className="text-foreground font-bold tabular-nums">
                  {Math.round(analysis.meanInterval)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground/60 text-[7px] uppercase">Min</div>
                <div className="text-foreground tabular-nums">{analysis.minInterval}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground/60 text-[7px] uppercase">Max</div>
                <div className="text-foreground tabular-nums">{analysis.maxInterval}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent spikes */}
        {analysis.spikes.length > 0 && (
          <div className="border-t border-border/40 pt-1.5">
            <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              Recent Spikes
            </div>
            <div className="space-y-0.5 max-h-20 overflow-y-auto">
              {analysis.spikes.slice(-5).reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-muted-foreground tabular-nums">
                    {new Date(s.epoch * 1000).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className={cn('tabular-nums font-bold', isBoom ? 'text-emerald-400' : 'text-destructive')}>
                    {s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground/60 tabular-nums">{s.ticksSincePrevious}t</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {analysis.zone === 'danger' && (
          <div className="flex items-start gap-1 px-1.5 py-1 bg-destructive/10 border border-destructive/30 rounded-sm">
            <AlertTriangle className="h-2.5 w-2.5 text-destructive shrink-0 mt-0.5" />
            <span className="text-[8px] font-mono text-destructive leading-tight">
              Spike imminent — prepare for {isBoom ? 'sharp upward' : 'sharp downward'} move
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
