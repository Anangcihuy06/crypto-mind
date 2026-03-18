import axios from 'axios';
import type { Signal, TechnicalFactors, Timeframe, Coin, CandleData } from '@/types';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateMovingAverages, detectTrend, getRSISignal, getMACDSignal } from '@/utils/technicalAnalysis';
import { formatPrice, formatPercentage, generateId } from '@/utils/formatters';
import { AI_CONFIG } from '@/config/ai';

function calculateSentimentScore(factors: TechnicalFactors, coin: Coin, priceChangePercent: number): number {
  let score = 0;
  
  if (factors.rsi < 30) score += 30;
  else if (factors.rsi > 70) score -= 30;
  else score += (50 - factors.rsi) * 0.3;
  
  if (factors.macd.histogram > 0) score += 20;
  else score -= 20;
  
  if (factors.trend === 'bullish') score += 25;
  else if (factors.trend === 'bearish') score -= 25;
  
  if (factors.movingAverages.trend === 'bullish') score += 15;
  else if (factors.movingAverages.trend === 'bearish') score -= 15;
  
  if (coin.change24h > 0) score += 10;
  else score -= 10;
  
  score += Math.min(Math.max(priceChangePercent * 2, -20), 20);
  
  return Math.round(score);
}

function findSupportLevels(prices: number[]): number[] {
  const levels: number[] = [];
  const recent = prices.slice(-50);
  
  for (let i = 2; i < recent.length - 2; i++) {
    if (recent[i] < recent[i-1] && recent[i] < recent[i-2] && 
        recent[i] < recent[i+1] && recent[i] < recent[i+2]) {
      if (!levels.length || recent[i] < levels[levels.length - 1] * 0.99) {
        levels.push(recent[i]);
        if (levels.length >= 3) break;
      }
    }
  }
  
  return levels.slice(0, 3);
}

function findResistanceLevels(prices: number[]): number[] {
  const levels: number[] = [];
  const recent = prices.slice(-50);
  
  for (let i = 2; i < recent.length - 2; i++) {
    if (recent[i] > recent[i-1] && recent[i] > recent[i-2] && 
        recent[i] > recent[i+1] && recent[i] > recent[i+2]) {
      if (!levels.length || recent[i] > levels[levels.length - 1] * 1.01) {
        levels.push(recent[i]);
        if (levels.length >= 3) break;
      }
    }
  }
  
  return levels.slice(0, 3);
}

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
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn('No OpenRouter API key provided, using technical analysis only');
    return generateSignalFromTechnical(coin, technicalFactors, timeframe);
  }

  try {
    const prices = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const currentPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2] || currentPrice;
    const priceChange = currentPrice - prevPrice;
    const priceChangePercent = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
    
    const recentCandles = candles.slice(-5);
    const high24h = Math.max(...highs.slice(-24));
    const low24h = Math.min(...lows.slice(-24));
    const avgVolume = volumes.slice(-24).reduce((a, b) => a + b, 0) / 24;
    
    const sentimentScore = calculateSentimentScore(technicalFactors, coin, priceChangePercent);
    const sentimentLabel = sentimentScore > 20 ? 'BULLISH' : sentimentScore < -20 ? 'BEARISH' : 'NEUTRAL';
    
    const supportLevels = findSupportLevels(lows);
    const resistanceLevels = findResistanceLevels(highs);

    const userMessage = `Analyze ${coin.symbol}/USDT on ${timeframe} timeframe and provide a trading signal.

CURRENT MARKET DATA:
- Symbol: ${coin.symbol}
- Name: ${coin.name}
- Current Price: $${formatPrice(currentPrice)}
- 24h High: $${formatPrice(high24h)}
- 24h Low: $${formatPrice(low24h)}
- 24h Change: ${formatPercentage(coin.change24h)} (${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(2)}% from previous candle)
- 7d Change: ${formatPercentage(coin.change7d)}
- Market Cap: $${(coin.marketCap / 1e9).toFixed(2)}B
- 24h Volume: $${(coin.volume24h / 1e9).toFixed(2)}B
- Avg Volume (24h): $${(avgVolume * currentPrice / 1e9).toFixed(2)}B
- Rank: #${coin.rank}

RECENT PRICE ACTION (Last 5 candles):
${recentCandles.map((c, i) => `- Candle ${i+1}: O: $${formatPrice(c.open)}, H: $${formatPrice(c.high)}, L: $${formatPrice(c.low)}, C: $${formatPrice(c.close)}`).join('\n')}

TECHNICAL INDICATORS (${timeframe} timeframe):
- RSI (14): ${technicalFactors.rsi.toFixed(2)} - Signal: ${technicalFactors.rsiSignal}
- MACD Line: ${technicalFactors.macd.macd.toFixed(4)}, Signal Line: ${technicalFactors.macd.signal.toFixed(4)}, Histogram: ${technicalFactors.macd.histogram.toFixed(4)}
- Bollinger Bands: Upper: $${formatPrice(technicalFactors.bollingerBands.upper)}, Middle: $${formatPrice(technicalFactors.bollingerBands.middle)}, Lower: $${formatPrice(technicalFactors.bollingerBands.lower)}
- SMA 20: $${formatPrice(technicalFactors.movingAverages.sma20)}
- SMA 50: $${formatPrice(technicalFactors.movingAverages.sma50)}
- SMA 200: $${formatPrice(technicalFactors.movingAverages.sma200)}
- Price Trend: ${technicalFactors.trend}
- Moving Average Trend: ${technicalFactors.movingAverages.trend}

KEY LEVELS:
- Support Levels: $${supportLevels.map(formatPrice).join(', ')}
- Resistance Levels: $${resistanceLevels.map(formatPrice).join(', ')}

MARKET SENTIMENT:
- Overall Sentiment: ${sentimentLabel} (Score: ${sentimentScore})
- RSI Sentiment: ${technicalFactors.rsiSignal}
- Trend Sentiment: ${technicalFactors.trend}
- Volume Analysis: ${volumes[volumes.length-1] > avgVolume * 1.5 ? 'High volume' : volumes[volumes.length-1] < avgVolume * 0.5 ? 'Low volume' : 'Normal volume'}

Based on the above data, provide your trading recommendation with:
1. Signal: BUY, SELL, or HOLD
2. Confidence level (0-100)
3. Entry Price (recommend at current price or slight discount/premium)
4. Stop Loss (calculate 2-5% below entry for BUY, above for SELL)
5. Take Profit (calculate at least 1.5x the risk distance)
6. Risk/Reward Ratio
7. Detailed reasoning
8. Key factors supporting your decision
9. Risk level: low, medium, or high

Return ONLY valid JSON without any additional text.`;

    const response = await api.post('/api/analyze', {
      message: userMessage,
      currentPrice: currentPrice,
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
        sources: ['Technical Analysis', 'AI Analysis (OpenRouter)'],
        model: analysis.model || AI_CONFIG.modelName,
      };
    }

    return generateSignalFromTechnical(coin, technicalFactors, timeframe);
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
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
    model: AI_CONFIG.modelName,
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
