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

interface VolumeAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  avgVolume: number;
  currentVolume: number;
  volumeRatio: number;
}

function analyzeVolume(volumes: number[]): VolumeAnalysis {
  const recent = volumes.slice(-20);
  const earlier = volumes.slice(-40, -20);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.length > 0 ? earlier.reduce((a, b) => a + b, 0) / earlier.length : recentAvg;
  
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = recentAvg > 0 ? currentVolume / recentAvg : 1;
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (recentAvg > earlierAvg * 1.2) trend = 'increasing';
  else if (recentAvg < earlierAvg * 0.8) trend = 'decreasing';
  
  return {
    trend,
    avgVolume: recentAvg,
    currentVolume,
    volumeRatio,
  };
}

function detectPriceStructure(prices: number[]): string {
  const recent = prices.slice(-20);
  const high = Math.max(...recent);
  const low = Math.min(...recent);
  const current = recent[recent.length - 1];
  const range = high - low;
  
  if (current > high * 0.95) return 'Near High (Resistance Breakout)';
  if (current < low * 1.05) return 'Near Low (Support Test)';
  if (current > (high + low) / 2 + range * 0.3) return 'Upper Range (Bullish)';
  if (current < (high + low) / 2 - range * 0.3) return 'Lower Range (Bearish)';
  return 'Mid Range (Neutral)';
}

async function fetchBTCData(): Promise<{ price: number; change24h: number; dominance: number } | null> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    const data = await response.json();
    if (data.symbol === 'BTCUSDT') {
      return {
        price: parseFloat(data.lastPrice) || 0,
        change24h: parseFloat(data.priceChangePercent) || 0,
        dominance: 50,
      };
    }
  } catch (error) {
    console.error('Error fetching BTC data:', error);
  }
  return null;
}

async function fetchFearGreedIndex(): Promise<{ value: number; classification: string } | null> {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    const data = await response.json();
    if (data.data && data.data[0]) {
      const value = parseInt(data.data[0].value);
      let classification = 'Neutral';
      if (value <= 25) classification = 'Extreme Fear';
      else if (value <= 45) classification = 'Fear';
      else if (value <= 55) classification = 'Neutral';
      else if (value <= 75) classification = 'Greed';
      else classification = 'Extreme Greed';
      return { value, classification };
    }
  } catch (error) {
    console.error('Error fetching Fear & Greed:', error);
  }
  return null;
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
  timeframe: Timeframe,
  higherTimeframeData?: CandleData[]
): Promise<Partial<Signal>> {
  try {
    const prices = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const currentPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2] || currentPrice;
    const priceChange = currentPrice - prevPrice;
    const priceChangePercent = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
    
    const recentCandles = candles.slice(-50);
    const high24h = Math.max(...highs.slice(-24));
    const low24h = Math.min(...lows.slice(-24));
    const avgVolume = volumes.slice(-24).reduce((a, b) => a + b, 0) / 24;
    
    const volumeAnalysis = analyzeVolume(volumes);
    const priceStructure = detectPriceStructure(prices);
    const sentimentScore = calculateSentimentScore(technicalFactors, coin, priceChangePercent);
    const sentimentLabel = sentimentScore > 20 ? 'BULLISH' : sentimentScore < -20 ? 'BEARISH' : 'NEUTRAL';
    
    const supportLevels = findSupportLevels(lows);
    const resistanceLevels = findResistanceLevels(highs);

    const [btcData, fearGreedData] = await Promise.all([
      fetchBTCData(),
      fetchFearGreedIndex(),
    ]);

    let higherTimeframeAnalysis = '';
    if (higherTimeframeData && higherTimeframeData.length > 0) {
      const htPrices = higherTimeframeData.map(c => c.close);
      const htTrend = htPrices[htPrices.length - 1] > htPrices[0] ? 'BULLISH' : 'BEARISH';
      const htCurrent = htPrices[htPrices.length - 1];
      const htStart = htPrices[0];
      const htChange = htStart > 0 ? ((htCurrent - htStart) / htStart * 100).toFixed(2) : '0';
      higherTimeframeAnalysis = `
HIGHER TIMEFRAME ANALYSIS (${timeframe === '1H' ? '4H' : '1D'}):
- Trend: ${htTrend}
- Change: ${htChange}%
- Price: $${formatPrice(htCurrent)}`;
    }

    const userMessage = `Analyze ${coin.symbol}/USDT on ${timeframe} timeframe and provide a trading signal.

=== CURRENT MARKET DATA ===
Symbol: ${coin.symbol}
Name: ${coin.name}
Current Price: $${formatPrice(currentPrice)}
24h High: $${formatPrice(high24h)}
24h Low: $${formatPrice(low24h)}
24h Change: ${formatPercentage(coin.change24h)} (${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(2)}% from previous)
7d Change: ${formatPercentage(coin.change7d)}
Market Cap: $${(coin.marketCap / 1e9).toFixed(2)}B
24h Volume: $${(coin.volume24h / 1e9).toFixed(2)}B
Rank: #${coin.rank}

=== PRICE STRUCTURE ===
Current Position: ${priceStructure}
Price Range (20 candles): High $${formatPrice(Math.max(...prices.slice(-20)))}, Low $${formatPrice(Math.min(...prices.slice(-20)))}

=== RECENT PRICE ACTION (Last 10 candles) ===
${recentCandles.slice(-10).map((c, i) => `Candle ${i+1}: O: $${formatPrice(c.open)}, H: $${formatPrice(c.high)}, L: $${formatPrice(c.low)}, C: $${formatPrice(c.close)}, V: ${c.volume.toFixed(0)}`).join('\n')}

=== VOLUME ANALYSIS ===
Volume Trend: ${volumeAnalysis.trend.toUpperCase()}
Current Volume: ${volumeAnalysis.currentVolume.toFixed(0)} (${(volumeAnalysis.volumeRatio * 100).toFixed(0)}% of average)
Avg Volume (20 periods): ${volumeAnalysis.avgVolume.toFixed(0)}
Volume Signal: ${volumeAnalysis.trend === 'increasing' ? 'High volume confirms move' : volumeAnalysis.trend === 'decreasing' ? 'Low volume, weak move' : 'Normal volume'}

=== TECHNICAL INDICATORS (${timeframe} timeframe) ===
RSI (14): ${technicalFactors.rsi.toFixed(2)} - Signal: ${technicalFactors.rsiSignal}
MACD: Line: ${technicalFactors.macd.macd.toFixed(4)}, Signal: ${technicalFactors.macd.signal.toFixed(4)}, Histogram: ${technicalFactors.macd.histogram.toFixed(4)}
Bollinger Bands: Upper: $${formatPrice(technicalFactors.bollingerBands.upper)}, Middle: $${formatPrice(technicalFactors.bollingerBands.middle)}, Lower: $${formatPrice(technicalFactors.bollingerBands.lower)}
SMA 20: $${formatPrice(technicalFactors.movingAverages.sma20)}
SMA 50: $${formatPrice(technicalFactors.movingAverages.sma50)}
SMA 200: $${formatPrice(technicalFactors.movingAverages.sma200)}
Price Trend: ${technicalFactors.trend.toUpperCase()}
MA Trend: ${technicalFactors.movingAverages.trend.toUpperCase()}

=== KEY LEVELS ===
Support Levels: $${supportLevels.map(formatPrice).join(', ')}
Resistance Levels: $${resistanceLevels.map(formatPrice).join(', ')}

=== MARKET SENTIMENT ===
Overall Sentiment: ${sentimentLabel} (Score: ${sentimentScore})
RSI Sentiment: ${technicalFactors.rsiSignal.toUpperCase()}
Trend Sentiment: ${technicalFactors.trend.toUpperCase()}
${fearGreedData ? `Fear & Greed Index: ${fearGreedData.value} (${fearGreedData.classification})` : 'Fear & Greed Index: Not available'}

=== BTC CORRELATION ===
${btcData ? `BTC Price: $${formatPrice(btcData.price)}
BTC 24h Change: ${formatPercentage(btcData.change24h)}
${coin.symbol} vs BTC: ${coin.change24h > btcData.change24h ? `${coin.symbol} outperforming BTC` : coin.change24h < btcData.change24h ? `${coin.symbol} underperforming BTC` : 'Moving in line with BTC'}` : 'BTC data not available'}

${higherTimeframeAnalysis}

=== ANALYSIS REQUIREMENTS ===
Based on all the data above, provide your trading recommendation.

1. Signal: BUY (if strong bullish setup), SELL (if strong bearish setup), HOLD (if unclear or conflicting signals)
2. Confidence: 0-100 (higher only if multiple factors align)
3. Entry Price: Current price or slight discount/premium
4. Stop Loss: 2-5% below entry for BUY, above for SELL
5. Take Profit: At least 1.5x the risk distance
6. Risk/Reward Ratio: Minimum 1.5
7. Reasoning: Detailed explanation with specific references to the data
8. Key Factors: 3-5 most important factors
9. Risk Level: low/medium/high based on setup quality

IMPORTANT: Consider ALL factors together. A signal is valid only when:
- Multiple indicators align (RSI, MACD, Trend)
- Volume confirms the move
- Price is near support (for BUY) or resistance (for SELL)
- Higher timeframe trend agrees (if available)

Return ONLY valid JSON without any additional text.`;
    
    const response = await api.post('/api/analyze', {
      message: userMessage,
      currentPrice: currentPrice,
    });

    console.log('[Claude Service] API Response:', response.data);

    if (response.data.error) {
      console.error('[Claude Service] API Error:', response.data.error);
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
      
      const isFromAI = analysis.fromAI && !analysis.fallback;
      
      console.log('[Claude Service] Signal:', analysis.signal, 'From AI:', isFromAI);
      
      return {
        type: analysis.signal,
        confidence: analysis.confidence,
        entryPrice,
        stopLoss,
        takeProfit,
        riskRewardRatio,
        reasoning: analysis.reasoning,
        aiAnalysis: analysis.keyFactors?.join('\n') || '',
        sources: isFromAI 
          ? ['AI Analysis (OpenRouter)'] 
          : ['Technical Analysis'],
        model: analysis.model || (isFromAI ? AI_CONFIG.modelName : 'Fallback'),
      };
    }

    console.log('[Claude Service] No valid signal, using fallback');
    return generateSignalFromTechnical(coin, technicalFactors, timeframe);
  } catch (error) {
    console.error('[Claude Service] Error:', error);
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
