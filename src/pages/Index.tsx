import { useState, useMemo } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { analyzeCandles } from '@/lib/indicators';
import { analyzeWithHMM } from '@/lib/hmm';
import { MarketSelector } from '@/components/MarketSelector';
import { SignalPanel } from '@/components/SignalPanel';
import { CandleChart } from '@/components/CandleChart';
import { MARKETS, TIMEFRAMES } from '@/lib/markets';
import { Activity, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const [symbol, setSymbol] = useState('R_100');
  const [granularity, setGranularity] = useState(60);
  const { candles, currentPrice, connected, error } = useDerivWebSocket(symbol, granularity);

  const analysis = useMemo(() => analyzeCandles(candles), [candles]);
  const hmm = useMemo(() => {
    const closes = candles.map(c => c.close);
    return analyzeWithHMM(closes);
  }, [candles]);

  const market = MARKETS.find(m => m.symbol === symbol);
  const activeTimeframe = TIMEFRAMES.find(t => t.granularity === granularity);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-base font-mono font-bold text-foreground tracking-tight">
            DERIV SIGNAL TERMINAL
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {market && (
            <span className="text-xs font-mono text-muted-foreground">
              {market.label}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {connected ? (
              <Wifi className="w-3.5 h-3.5 text-bullish" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-bearish" />
            )}
            <span className={`text-[10px] font-mono ${connected ? 'text-bullish' : 'text-bearish'}`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-mono text-destructive">{error}</span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3">
        {/* Left sidebar */}
        <div className="lg:w-56 shrink-0 space-y-3">
          <MarketSelector selected={symbol} onSelect={setSymbol} />
        </div>

        {/* Center chart */}
        <div className="flex-1 min-w-0">
          <CandleChart candles={candles} hmm={hmm} />

          {/* Disclaimer */}
          <div className="mt-2 px-2">
            <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
              ⚠ This tool is for educational purposes only. No indicator can predict future price movements.
              Trade at your own risk. Past performance does not guarantee future results.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:w-64 shrink-0">
          <SignalPanel analysis={analysis} hmm={hmm} currentPrice={currentPrice} symbol={symbol} />
        </div>
      </div>
    </div>
  );
};

export default Index;
