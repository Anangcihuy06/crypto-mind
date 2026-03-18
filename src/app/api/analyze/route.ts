import { NextResponse } from 'next/server';
import { AI_CONFIG } from '@/config/ai';

const SYSTEM_PROMPT = `You are an expert cryptocurrency trading analyst with deep knowledge of technical analysis, market psychology, and trading strategies. Your role is to analyze market data and provide accurate, CONSERVATIVE trading signals.

CRITICAL RULES:
1. BE CONSERVATIVE - Only give BUY or SELL signals when MULTIPLE strong factors align
2. When in doubt, return HOLD - It's better to miss a trade than to take a losing trade
3. NEVER give a signal against the primary trend - Trend is your friend
4. Require CONFLUENCE - At least 3 of these factors must agree:
   - RSI is oversold (<35) for BUY or overbought (>65) for SELL
   - MACD histogram is positive for BUY or negative for SELL  
   - Price is at strong support (for BUY) or resistance (for SELL)
   - Trend is bullish (for BUY) or bearish (for SELL)
   - Moving averages are aligned (price > MA20 > MA50 for BUY)
5. LOWER confidence if indicators are mixed or conflicting
6. For SELL signals in an uptrend - you must see clear reversal signals (RSI >70, MACD turning negative, price breaking support)

When calculating:
- Stop Loss: 2-5% below entry for BUY, above entry for SELL
- Take Profit: At least 1.5x the risk distance (e.g., if SL is 5% away, TP should be 7.5%+ away)
- Entry Price: Current market price or slight discount/premium only

Provide your analysis in a JSON format:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": number (0-100, but be REALISTIC - most setups are 50-75%, only very strong ones are 80%+),
  "entryPrice": number,
  "stopLoss": number,
  "takeProfit": number,
  "riskRewardRatio": number,
  "reasoning": "string explaining WHY this signal",
  "keyFactors": ["string"],
  "riskLevel": "low" | "medium" | "high"
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, currentPrice } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    console.log('OpenRouter API Key exists:', !!apiKey);
    console.log('Using model:', AI_CONFIG.model);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://crypto-mind-virid.vercel.app',
        'X-Title': 'CryptoMind',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      let jsonStr = content.trim();
      
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0];
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0];
      }
      
      jsonStr = jsonStr.trim();
      
      const analysis = JSON.parse(jsonStr);
      
      console.log('AI Analysis Response:', JSON.stringify(analysis, null, 2));
      
      analysis.model = AI_CONFIG.modelName;
      
      if (!analysis.entryPrice || !analysis.stopLoss || !analysis.takeProfit) {
        console.warn('AI response missing price targets, using calculated values');
        
        const price = currentPrice || 50000;
        
        if (analysis.signal === 'BUY') {
          analysis.entryPrice = analysis.entryPrice || price;
          analysis.stopLoss = analysis.stopLoss || price * 0.97;
          analysis.takeProfit = analysis.takeProfit || price * 1.06;
        } else if (analysis.signal === 'SELL') {
          analysis.entryPrice = analysis.entryPrice || price;
          analysis.stopLoss = analysis.stopLoss || price * 1.03;
          analysis.takeProfit = analysis.takeProfit || price * 0.94;
        } else {
          analysis.entryPrice = price;
          analysis.stopLoss = price * 0.95;
          analysis.takeProfit = price * 1.05;
        }
        
        analysis.riskRewardRatio = analysis.riskRewardRatio || 
          Math.abs((analysis.takeProfit - analysis.entryPrice) / (analysis.entryPrice - analysis.stopLoss));
      }
      
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json({
        signal: 'HOLD',
        confidence: 50,
        reasoning: 'Could not parse AI response, using technical analysis only',
        keyFactors: ['Technical analysis fallback'],
        riskLevel: 'medium',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to analyze market' },
      { status: 500 }
    );
  }
}
