import axios from 'axios';
import type { Signal, TechnicalFactors, Timeframe, Coin, CandleData } from '@/types';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateMovingAverages, detectTrend, getRSISignal, getMACDSignal } from '@/utils/technicalAnalysis';
import { formatPrice, formatPercentage, generateId } from '@/utils/formatters';

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

const SYSTEM_PROMPT = `You are an expert cryptocurrency trading analyst with deep knowledge of technical analysis, market psychology, and trading strategies. Your role is to analyze market data and provide clear, actionable trading signals with precise price levels.

When analyzing, consider:
1. Technical Indicators: RSI, MACD, Bollinger Bands, Moving Averages
2. Price Action: Trends, patterns, support/resistance
3. Market Context: Volume, market sentiment
4. Risk Management: Always calculate proper stop loss and take profit levels

Provide your analysis in a structured format with clear reasoning. Always be honest about uncertainty - don't hesitate to say "HOLD" if the market is unclear.

Respond with JSON in this exact format:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": number (0-100),
  "entryPrice": number (recommended entry price based on current market),
  "stopLoss": number (stop loss price for risk management),
  "takeProfit": number (take profit price for profit taking),
  "riskRewardRatio": number (ratio of potential profit vs risk, e.g., 2.5),
  "reasoning": "string",
  "keyFactors": ["string", "string"],
  "riskLevel": "low" | "medium" | "high"
}`;

export async function analyzeMarketWithAI(
  coin: Coin,
  candles: CandleData[],
  technicalFactors: TechnicalFactors,
  timeframe: Timeframe
): Promise<Partial<Signal>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('No Anthropic API key provided, using technical analysis only');
    return generateSignalFromTechnical(coin, technicalFactors, timeframe);
  }

  try {
    const prices = candles.map(c => c.close);
    const currentPrice = prices[prices.length - 1];
    
    const userMessage = `Analyze the following cryptocurrency:

Symbol: ${coin.symbol}
Name: ${coin.name}
Current Price: $${formatPrice(currentPrice)}
24h Change: ${formatPercentage(coin.change24h)}
7d Change: ${formatPercentage(coin.change7d)}
Market Cap: $${(coin.marketCap / 1e9).toFixed(2)}B
24h Volume: $${(coin.volume24h / 1e9).toFixed(2)}B
Rank: #${coin.rank}

Technical Analysis (${timeframe} timeframe):
- RSI (14): ${technicalFactors.rsi.toFixed(2)} - ${technicalFactors.rsiSignal}
- MACD: ${technicalFactors.macd.macd.toFixed(4)} - Signal: ${technicalFactors.macd.signal.toFixed(4)} - Histogram: ${technicalFactors.macd.histogram.toFixed(4)}
- Bollinger Bands: Upper: ${formatPrice(technicalFactors.bollingerBands.upper)}, Middle: ${formatPrice(technicalFactors.bollingerBands.middle)}, Lower: ${formatPrice(technicalFactors.bollingerBands.lower)}
- Moving Averages: SMA20: ${formatPrice(technicalFactors.movingAverages.sma20)}, SMA50: ${formatPrice(technicalFactors.movingAverages.sma50)}, SMA200: ${formatPrice(technicalFactors.movingAverages.sma200)}
- Trend: ${technicalFactors.trend}
- Overall Trend: ${technicalFactors.movingAverages.trend}

Provide your trading recommendation with confidence level and detailed reasoning.`;

    const response = await api.post('/api/analyze', {
      message: userMessage,
    });

    if (response.data.error) {
      console.error('Claude API error:', response.data.error);
      return generateSignalFromTechnical(coin, technicalFactors, timeframe);
    }

    const analysis = response.data;
    
    if (analysis.signal) {
      const currentPrice = coin.price;
      const entryPrice = analysis.entryPrice || currentPrice;
      const stopLoss = analysis.stopLoss;
      const takeProfit = analysis.takeProfit;
      
      let riskRewardRatio = analysis.riskRewardRatio;
      if (!riskRewardRatio && stopLoss && takeProfit) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        riskRewardRatio = risk > 0 ? reward / risk : 0;
      }
      
      return {
        type: analysis.signal,
        confidence: analysis.confidence,
        entryPrice,
        stopLoss,
        takeProfit,
        riskRewardRatio,
        reasoning: analysis.reasoning,
        aiAnalysis: analysis.keyFactors?.join('\n'),
        sources: ['Technical Analysis', 'AI Analysis (Claude)'],
      };
    }

    return generateSignalFromTechnical(coin, technicalFactors, timeframe);
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return generateSignalFromTechnical(coin, technicalFactors, timeframe);
  }
}

function generateSignalFromTechnical(
  coin: Coin,
  factors: TechnicalFactors,
  timeframe: Timeframe
): Partial<Signal> {
  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  if (factors.rsiSignal === 'oversold') {
    buyScore += 30;
    reasons.push('RSI oversold - potential bounce');
  } else if (factors.rsiSignal === 'overbought') {
    sellScore += 30;
    reasons.push('RSI overbought - potential correction');
  }

  if (factors.macd.histogram > 0 && factors.macd.macd > factors.macd.signal) {
    buyScore += 25;
    reasons.push('MACD bullish crossover');
  } else if (factors.macd.histogram < 0 && factors.macd.macd < factors.macd.signal) {
    sellScore += 25;
    reasons.push('MACD bearish crossover');
  }

  if (factors.movingAverages.trend === 'bullish') {
    buyScore += 20;
    reasons.push('Price above key moving averages');
  } else if (factors.movingAverages.trend === 'bearish') {
    sellScore += 20;
    reasons.push('Price below key moving averages');
  }

  if (coin.change24h < -5) {
    buyScore += 15;
    reasons.push('Significant daily drop - potential oversold');
  } else if (coin.change24h > 5) {
    sellScore += 15;
    reasons.push('Significant daily gain - potential overbought');
  }

  const total = buyScore + sellScore;
  const confidence = total > 0 ? Math.min(Math.round((Math.abs(buyScore - sellScore) / total) * 50 + 50), 95) : 50;

  let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (buyScore > sellScore + 10) type = 'BUY';
  else if (sellScore > buyScore + 10) type = 'SELL';

  // Calculate price targets based on technical indicators
  const currentPrice = coin.price;
  const { bollingerBands } = factors;
  
  let entryPrice = currentPrice;
  let stopLoss: number | undefined;
  let takeProfit: number | undefined;
  let riskRewardRatio: number | undefined;

  if (type === 'BUY') {
    // For BUY signals
    entryPrice = currentPrice;
    stopLoss = bollingerBands.lower * 0.98;
    takeProfit = bollingerBands.upper * 1.02;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    riskRewardRatio = risk > 0 ? reward / risk : 0;
  } else if (type === 'SELL') {
    // For SELL signals
    entryPrice = currentPrice;
    stopLoss = bollingerBands.upper * 1.02;
    takeProfit = bollingerBands.lower * 0.98;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    riskRewardRatio = risk > 0 ? reward / risk : 0;
  }

  return {
    type,
    confidence,
    entryPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio,
    reasoning: reasons.join('. '),
    sources: ['Technical Analysis'],
  };
}

export function calculateTechnicalFactors(
  candles: CandleData[],
  coin: Coin
): TechnicalFactors {
  const prices = candles.map(c => c.close);
  
  const rsi = calculateRSI(prices, 14);
  const lastRSI = rsi[rsi.length - 1];
  
  const macdData = calculateMACD(prices);
  const lastMACD = macdData[macdData.length - 1];
  
  const bbData = calculateBollingerBands(prices);
  const lastBB = bbData[bbData.length - 1];
  
  const maData = calculateMovingAverages(prices);
  
  const trend = detectTrend(candles);

  return {
    rsi: isNaN(lastRSI) ? 50 : lastRSI,
    rsiSignal: getRSISignal(isNaN(lastRSI) ? 50 : lastRSI),
    macd: {
      macd: isNaN(lastMACD.macd) ? 0 : lastMACD.macd,
      signal: isNaN(lastMACD.signal) ? 0 : lastMACD.signal,
      histogram: isNaN(lastMACD.histogram) ? 0 : lastMACD.histogram,
    },
    bollingerBands: {
      upper: isNaN(lastBB.upper) ? 0 : lastBB.upper,
      middle: isNaN(lastBB.middle) ? 0 : lastBB.middle,
      lower: isNaN(lastBB.lower) ? 0 : lastBB.lower,
      position: lastBB.position,
    },
    movingAverages: maData,
    trend,
  };
}
