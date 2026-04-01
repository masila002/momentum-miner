import { MARKETS, MARKET_CATEGORIES, type Market } from '@/lib/markets';
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
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="text-sm font-mono font-semibold text-foreground">MARKETS</span>
      </div>
      <div className="p-3 space-y-3">
        {/* Category tabs */}
        <div className="flex gap-1">
          {MARKET_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors',
                activeCategory === cat.id
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Market list */}
        <div className="grid grid-cols-2 gap-1.5">
          {filtered.map(market => (
            <button
              key={market.symbol}
              onClick={() => onSelect(market.symbol)}
              className={cn(
                'px-3 py-2 rounded text-xs font-mono text-left transition-all',
                selected === market.symbol
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
              )}
            >
              <div className="font-semibold">{market.label}</div>
              <div className="text-[10px] opacity-60">{market.symbol}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
