import type { CandleData, MACDData, BollingerData, MovingAverageData } from '@/types';

export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sum += data[i];
      ema.push(NaN);
    } else if (i === period - 1) {
      sum += data[i];
      ema.push(sum / period);
    } else {
      const prevEma = ema[i - 1];
      ema.push((data[i] - prevEma) * multiplier + prevEma);
    }
  }
  
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  rsi.push(NaN);
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      rsi.push(NaN);
      continue;
    }
    
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  
  return rsi;
}

export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData[] {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  const validMACD = macdLine.filter(x => !isNaN(x));
  const signalEMA = calculateEMA(validMACD, signalPeriod);
  
  const result: MACDData[] = [];
  let signalIndex = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(macdLine[i])) {
      result.push({ macd: NaN, signal: NaN, histogram: NaN });
    } else {
      const signal = signalEMA[signalIndex];
      const histogram = macdLine[i] - signal;
      result.push({
        macd: macdLine[i],
        signal: signal,
        histogram: histogram,
      });
      signalIndex++;
    }
  }
  
  return result;
}

export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerData[] {
  const sma = calculateSMA(data, period);
  const result: BollingerData[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({
        upper: NaN,
        middle: NaN,
        lower: NaN,
        position: 0,
      });
      continue;
    }
    
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const squaredDiffs = slice.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    const upper = mean + stdDev * standardDeviation;
    const lower = mean - stdDev * standardDeviation;
    
    let position = 0;
    if (!isNaN(data[i])) {
      position = (data[i] - lower) / (upper - lower);
    }
    
    result.push({
      upper,
      middle: mean,
      lower,
      position,
    });
  }
  
  return result;
}

export function calculateMovingAverages(prices: number[]): MovingAverageData {
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const sma200 = calculateSMA(prices, 200);
  
  const lastPrice = prices[prices.length - 1];
  const lastSMA20 = sma20[sma20.length - 1];
  const lastSMA50 = sma50[sma50.length - 1];
  const lastSMA200 = sma200[sma200.length - 1];
  
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (lastPrice > lastSMA20 && lastSMA20 > lastSMA50 && lastSMA50 > lastSMA200) {
    trend = 'bullish';
  } else if (lastPrice < lastSMA20 && lastSMA20 < lastSMA50 && lastSMA50 < lastSMA200) {
    trend = 'bearish';
  }
  
  return {
    sma20: lastSMA20,
    sma50: lastSMA50,
    sma200: lastSMA200,
    trend,
  };
}

export function getRSISignal(rsi: number): 'oversold' | 'overbought' | 'neutral' {
  if (rsi <= 30) return 'oversold';
  if (rsi >= 70) return 'overbought';
  return 'neutral';
}

export function getMACDSignal(macd: MACDData): 'bullish' | 'bearish' | 'neutral' {
  if (macd.histogram > 0 && macd.macd > macd.signal) return 'bullish';
  if (macd.histogram < 0 && macd.macd < macd.signal) return 'bearish';
  return 'neutral';
}

export function detectTrend(candles: CandleData[]): 'bullish' | 'bearish' | 'neutral' {
  if (candles.length < 20) return 'neutral';
  
  const recentPrices = candles.slice(-20).map(c => c.close);
  const firstPrice = recentPrices[0];
  const lastPrice = recentPrices[recentPrices.length - 1];
  const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  if (percentChange > 5) return 'bullish';
  if (percentChange < -5) return 'bearish';
  return 'neutral';
}

export function findSupportResistance(candles: CandleData[]): { support: number[]; resistance: number[] } {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  const resistance: number[] = [];
  const support: number[] = [];
  
  for (let i = 5; i < highs.length - 5; i++) {
    const isLocalMax = highs[i] > highs[i - 1] && 
                      highs[i] > highs[i - 2] && 
                      highs[i] > highs[i + 1] && 
                      highs[i] > highs[i + 2];
    
    const isLocalMin = lows[i] < lows[i - 1] && 
                      lows[i] < lows[i - 2] && 
                      lows[i] < lows[i + 1] && 
                      lows[i] < lows[i + 2];
    
    if (isLocalMax) {
      resistance.push(highs[i]);
    }
    if (isLocalMin) {
      support.push(lows[i]);
    }
  }
  
  return {
    support: support.slice(-5),
    resistance: resistance.slice(-5),
  };
}

export function calculatePivotPoints(high: number, low: number, close: number): {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
} {
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const r2 = pivot + (high - low);
  const r3 = high + 2 * (pivot - low);
  const s1 = 2 * pivot - high;
  const s2 = pivot - (high - low);
  const s3 = low - 2 * (high - pivot);
  
  return { pivot, r1, r2, r3, s1, s2, s3 };
}
