import { Wifi, WifiOff } from 'lucide-react';

interface TickerBarProps {
  symbol: string;
  marketLabel: string;
  currentPrice: number | null;
  connected: boolean;
  previousPrice: number | null;
}

export function TickerBar({ symbol, marketLabel, currentPrice, connected, previousPrice }: TickerBarProps) {
  const priceDirection = currentPrice && previousPrice
    ? currentPrice > previousPrice ? 'up' : currentPrice < previousPrice ? 'down' : 'flat'
    : 'flat';

  return (
    <div className="h-7 bg-card border-b border-border flex items-center px-2 gap-4 overflow-hidden">
      {/* Connection Status */}
      <div className="flex items-center gap-1 shrink-0">
        {connected ? (
          <Wifi className="w-3 h-3 text-bullish" />
        ) : (
          <WifiOff className="w-3 h-3 text-bearish" />
        )}
        <span className={`text-[9px] font-mono font-bold ${connected ? 'text-bullish' : 'text-bearish'}`}>
          {connected ? 'LIVE' : 'DISC'}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-3.5 bg-border" />

      {/* Active Symbol */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono font-bold text-primary">{symbol}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{marketLabel}</span>
      </div>

      {/* Separator */}
      <div className="w-px h-3.5 bg-border" />

      {/* Price */}
      {currentPrice !== null && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">Last:</span>
          <span className={`text-[11px] font-mono font-bold ${
            priceDirection === 'up' ? 'text-bullish' : priceDirection === 'down' ? 'text-bearish' : 'text-foreground'
          }`}>
            {currentPrice.toFixed(currentPrice > 100 ? 2 : 4)}
          </span>
          {priceDirection === 'up' && <span className="text-[9px] text-bullish">▲</span>}
          {priceDirection === 'down' && <span className="text-[9px] text-bearish">▼</span>}
        </div>
      )}

      {/* Spacer with repeating dots */}
      <div className="flex-1" />

      {/* Timestamp */}
      <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0">
        {new Date().toLocaleTimeString('en-US', { hour12: false })}
      </span>
    </div>
  );
}