export type Timeframe = '1H' | '4H' | '1D' | '1W';

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface Coin {
  id: number;
  symbol: string;
  name: string;
  slug: string;
  rank: number;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  lastUpdated: string;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  value: number;
  pnl: number;
  pnlPercentage: number;
  openTime: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  value: number;
  fee: number;
  timestamp: number;
  pnl?: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  price?: number;
  quantity: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  createdAt: number;
  filledAt?: number;
}

export interface Signal {
  id: string;
  symbol: string;
  type: SignalType;
  confidence: number;
  timeframe: Timeframe;
  price: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  reasoning: string;
  technicalFactors: TechnicalFactors;
  aiAnalysis?: string;
  sources: string[];
  model?: string;
  createdAt: number;
}

export interface TechnicalFactors {
  rsi: number;
  rsiSignal: 'oversold' | 'overbought' | 'neutral';
  macd: MACDData;
  bollingerBands: BollingerData;
  movingAverages: MovingAverageData;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  position: number;
}

export interface MovingAverageData {
  sma20: number;
  sma50: number;
  sma200: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface MarketStats {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  fearGreedIndex: number;
  fearGreedSignal: 'fear' | 'extreme_fear' | 'neutral' | 'extreme_greed' | 'greed';
}

export interface AIMarketAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  keyFactors: string[];
  pricePrediction: {
    shortTerm: string;
    mediumTerm: string;
    confidence: number;
  };
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface Settings {
  cmcApiKey: string;
  anthropicApiKey?: string;
  selectedTimeframe: Timeframe;
  autoRefresh: boolean;
  refreshInterval: number;
  paperBalance: number;
}

export interface ChartIndicator {
  type: 'RSI' | 'MACD' | 'BB' | 'MA';
  enabled: boolean;
  params?: Record<string, number>;
}
