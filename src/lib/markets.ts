export interface Market {
  symbol: string;
  label: string;
  category: 'volatility' | 'boom' | 'crash';
}

export const MARKETS: Market[] = [
  // Volatility Indices
  { symbol: 'R_10', label: 'Volatility 10', category: 'volatility' },
  { symbol: 'R_25', label: 'Volatility 25', category: 'volatility' },
  { symbol: 'R_50', label: 'Volatility 50', category: 'volatility' },
  { symbol: 'R_75', label: 'Volatility 75', category: 'volatility' },
  { symbol: 'R_100', label: 'Volatility 100', category: 'volatility' },
  { symbol: '1HZ10V', label: 'Volatility 10 (1s)', category: 'volatility' },
  { symbol: '1HZ25V', label: 'Volatility 25 (1s)', category: 'volatility' },
  { symbol: '1HZ50V', label: 'Volatility 50 (1s)', category: 'volatility' },
  { symbol: '1HZ75V', label: 'Volatility 75 (1s)', category: 'volatility' },
  { symbol: '1HZ100V', label: 'Volatility 100 (1s)', category: 'volatility' },
  // Boom
  { symbol: 'BOOM300N', label: 'Boom 300', category: 'boom' },
  { symbol: 'BOOM500N', label: 'Boom 500', category: 'boom' },
  { symbol: 'BOOM1000N', label: 'Boom 1000', category: 'boom' },
  // Crash
  { symbol: 'CRASH300N', label: 'Crash 300', category: 'crash' },
  { symbol: 'CRASH500N', label: 'Crash 500', category: 'crash' },
  { symbol: 'CRASH1000N', label: 'Crash 1000', category: 'crash' },
];

export const MARKET_CATEGORIES = [
  { id: 'volatility' as const, label: 'Volatility' },
  { id: 'boom' as const, label: 'Boom' },
  { id: 'crash' as const, label: 'Crash' },
];

export interface Timeframe {
  label: string;
  granularity: number; // seconds
}

export const TIMEFRAMES: Timeframe[] = [
  { label: '30s', granularity: 30 },
  { label: '1m', granularity: 60 },
  { label: '2m', granularity: 120 },
  { label: '5m', granularity: 300 },
];
