import { MARKETS, MARKET_CATEGORIES } from '@/lib/markets';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MarketSelectorProps {
  selected: string;
  onSelect: (symbol: string) => void;
}

export function MarketSelector({ selected, onSelect }: MarketSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('volatility');
  const filtered = MARKETS.filter(m => m.category === activeCategory);

  return (
    <div className="terminal-panel h-full flex flex-col">
      <div className="terminal-header py-1.5 px-3">
        <span className="text-[11px] font-mono font-semibold text-foreground tracking-wider">WATCHLIST</span>
      </div>

      {/* Category tabs - compact */}
      <div className="flex border-b border-border">
        {MARKET_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex-1 px-1 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors border-b-2',
              activeCategory === cat.id
                ? 'text-primary border-primary bg-primary/5'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Market list - compact rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(market => (
          <button
            key={market.symbol}
            onClick={() => onSelect(market.symbol)}
            className={cn(
              'w-full px-3 py-1.5 flex items-center justify-between text-left transition-all border-b border-border/30',
              selected === market.symbol
                ? 'bg-primary/10 border-l-2 border-l-primary'
                : 'hover:bg-secondary/50 border-l-2 border-l-transparent'
            )}
          >
            <div>
              <div className={cn(
                'text-[10px] font-mono font-semibold',
                selected === market.symbol ? 'text-primary' : 'text-foreground'
              )}>
                {market.label}
              </div>
              <div className="text-[8px] font-mono text-muted-foreground/50">{market.symbol}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}