export const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

export const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

export const DEFAULT_PAPER_BALANCE = 10000;

export const TRADING_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'DOGE/USDT',
  'AVAX/USDT',
  'DOT/USDT',
  'LINK/USDT',
  'MATIC/USDT',
  'UNI/USDT',
  'ATOM/USDT',
  'LTC/USDT',
  'ETC/USDT',
  'XLM/USDT',
  'VET/USDT',
  'FIL/USDT',
  'TRX/USDT',
  'NEAR/USDT',
];

export const TIMEFRAME_INTERVALS = {
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
  '1W': '1w',
} as const;

export const TIMEFRAME_LABELS = {
  '1H': '1 Hour',
  '4H': '4 Hours',
  '1D': '1 Day',
  '1W': '1 Week',
} as const;

export const INDICATOR_DEFAULTS = {
  RSI: {
    period: 14,
    overbought: 70,
    oversold: 30,
  },
  MACD: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  },
  BB: {
    period: 20,
    stdDev: 2,
  },
  MA: {
    period20: 20,
    period50: 50,
    period200: 200,
  },
};

export const SIGNAL_CONFIDENCE_THRESHOLDS = {
  LOW: 40,
  MEDIUM: 60,
  HIGH: 80,
};

export const API_RATE_LIMITS = {
  CMC: {
    free: 300,
    perMinute: 10,
  },
  BINANCE: {
    perMinute: 1200,
  },
};

export const CACHE_TTL = {
  prices: 60 * 1000,
  candles: 5 * 60 * 1000,
  marketStats: 60 * 1000,
};
