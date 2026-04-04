import { useState, useMemo, useRef, useEffect } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { analyzeCandles } from '@/lib/indicators';
import { analyzeWithHMM } from '@/lib/hmm';
import { MarketSelector } from '@/components/MarketSelector';
import { SignalPanel } from '@/components/SignalPanel';
import { CandleChart } from '@/components/CandleChart';
import { MarketPressure } from '@/components/MarketPressure';
import { TickerBar } from '@/components/TickerBar';
import { MARKETS, TIMEFRAMES } from '@/lib/markets';
import { cn } from '@/lib/utils';

const Index = () => {
  const [symbol, setSymbol] = useState('R_100');
  const [granularity, setGranularity] = useState(60);
  const { candles, currentPrice, connected, error } = useDerivWebSocket(symbol, granularity);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentPrice !== null) {
      prevPriceRef.current = currentPrice;
    }
  }, [currentPrice]);

  const analysis = useMemo(() => analyzeCandles(candles), [candles]);
  const hmm = useMemo(() => {
    const closes = candles.map(c => c.close);
    return analyzeWithHMM(closes);
  }, [candles]);

  const market = MARKETS.find(m => m.symbol === symbol);
  const activeTimeframe = TIMEFRAMES.find(t => t.granularity === granularity);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Menu Bar - DAS style */}
      <div className="h-8 bg-card border-b border-border flex items-center px-3 gap-4 shrink-0">
        <span className="text-[11px] font-mono font-black text-primary tracking-widest">DST</span>
        <div className="w-px h-4 bg-border" />
        <span className="text-[10px] font-mono text-muted-foreground">DERIV SIGNAL TERMINAL</span>
        <div className="flex-1" />
        {error && (
          <span className="text-[9px] font-mono text-destructive">⚠ {error}</span>
        )}
      </div>

      {/* Ticker Bar */}
      <TickerBar
        symbol={symbol}
        marketLabel={market?.label || ''}
        currentPrice={currentPrice}
        connected={connected}
        previousPrice={prevPriceRef.current}
      />

      {/* Main Content - 3 column DAS layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Watchlist */}
        <div className="w-44 border-r border-border shrink-0 flex flex-col">
          <MarketSelector selected={symbol} onSelect={setSymbol} />
        </div>

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Timeframe toolbar */}
          <div className="h-7 bg-card/50 border-b border-border flex items-center px-2 gap-0.5 shrink-0">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.granularity}
                onClick={() => setGranularity(tf.granularity)}
                className={cn(
                  'px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors rounded-sm',
                  granularity === tf.granularity
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {tf.label}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-[8px] font-mono text-muted-foreground/40">
              ⚠ Educational only — not financial advice
            </span>
          </div>

          {/* Chart area */}
          <div className="flex-1 min-h-0">
            <CandleChart candles={candles} hmm={hmm} timeframeLabel={activeTimeframe?.label || '1m'} />
          </div>
        </div>

        {/* Right Panel - Signal + Pressure */}
        <div className="w-52 border-l border-border shrink-0 overflow-y-auto">
          <div className="p-1.5 space-y-1.5">
            <SignalPanel analysis={analysis} hmm={hmm} currentPrice={currentPrice} symbol={symbol} />
            <MarketPressure candles={candles} hmm={hmm} />
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="h-5 bg-card border-t border-border flex items-center px-3 shrink-0">
        <span className="text-[8px] font-mono text-muted-foreground/40">
          Deriv Signal Terminal v1.0 — WebSocket: {connected ? 'Connected' : 'Disconnected'} — {candles.length} candles loaded
        </span>
      </div>
    </div>
  );
};

export default Index;