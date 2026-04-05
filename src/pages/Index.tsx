import { useState, useMemo, useRef, useEffect } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { useMultiTimeframe } from '@/hooks/useMultiTimeframe';
import { analyzeCandles } from '@/lib/indicators';
import { analyzeWithHMM } from '@/lib/hmm';
import { analyzeMultiTimeframe, resetSignalState } from '@/lib/signalEngine';
import { calculateTradeLevels } from '@/lib/tradeLevels';
import { MarketSelector } from '@/components/MarketSelector';
import { SignalPanel } from '@/components/SignalPanel';
import { CandleChart } from '@/components/CandleChart';
import { MarketPressure } from '@/components/MarketPressure';
import { TradeLevelsPanel } from '@/components/TradeLevelsPanel';
import { TickerBar } from '@/components/TickerBar';
import { MARKETS, TIMEFRAMES } from '@/lib/markets';
import { cn } from '@/lib/utils';

const ALL_GRANULARITIES = TIMEFRAMES.map(t => t.granularity);

const Index = () => {
  const [symbol, setSymbol] = useState('R_100');
  const [granularity, setGranularity] = useState(60);
  const prevPriceRef = useRef<number | null>(null);

  // Primary timeframe for chart display
  const { candles, currentPrice, connected, error } = useDerivWebSocket(symbol, granularity);

  // Multi-timeframe data for signal confirmation
  const { data: mtfData, connected: mtfConnected } = useMultiTimeframe(symbol, ALL_GRANULARITIES);

  // Reset signal state on symbol change
  useEffect(() => {
    resetSignalState();
  }, [symbol]);

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

  // Multi-timeframe confirmed signal
  const multiTF = useMemo(() => {
    return analyzeMultiTimeframe(mtfData, ALL_GRANULARITIES);
  }, [mtfData]);

  // Auto-calculate trade levels based on confirmed signal
  const tradeLevels = useMemo(() => {
    const signal = multiTF?.confirmedSignal ?? analysis?.signal ?? 'NEUTRAL';
    return calculateTradeLevels(candles, signal, currentPrice);
  }, [candles, currentPrice, multiTF, analysis]);

  const market = MARKETS.find(m => m.symbol === symbol);
  const activeTimeframe = TIMEFRAMES.find(t => t.granularity === granularity);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Menu Bar */}
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

      {/* Main Content */}
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
            <CandleChart candles={candles} hmm={hmm} timeframeLabel={activeTimeframe?.label || '1m'} tradeLevels={tradeLevels} />
          </div>
        </div>

        {/* Right Panel - Signal + Pressure */}
        <div className="w-52 border-l border-border shrink-0 overflow-y-auto">
          <div className="p-1.5 space-y-1.5">
            <SignalPanel analysis={analysis} hmm={hmm} currentPrice={currentPrice} symbol={symbol} multiTF={multiTF} />
            <TradeLevelsPanel levels={tradeLevels} />
            <MarketPressure candles={candles} hmm={hmm} />
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="h-5 bg-card border-t border-border flex items-center px-3 shrink-0">
        <span className="text-[8px] font-mono text-muted-foreground/40">
          Deriv Signal Terminal v1.1 — WS: {connected ? 'Live' : 'Off'} — MTF: {mtfConnected ? 'Live' : 'Off'} — {candles.length} candles — Multi-TF confirmation active
        </span>
      </div>
    </div>
  );
};

export default Index;
