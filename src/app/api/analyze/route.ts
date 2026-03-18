import { NextResponse } from 'next/server';
import { AI_CONFIG } from '@/config/ai';

const SYSTEM_PROMPT = `You are an expert cryptocurrency trading analyst with deep knowledge of technical analysis, market psychology, and trading strategies. Your role is to analyze market data and provide clear, actionable trading signals with precise price levels.

When analyzing, consider:
1. Technical Indicators: RSI, MACD, Bollinger Bands, Moving Averages
2. Price Action: Trends, patterns, support/resistance levels
3. Market Context: Volume, market sentiment, correlation with Bitcoin
4. Risk Management: Always calculate proper stop loss and take profit levels

IMPORTANT: You must provide actual numerical values for entryPrice, stopLoss, and takeProfit based on the current price and technical analysis. Calculate stop loss at 2-5% below entry for BUY and above entry for SELL. Calculate take profit at 1.5-3x the risk distance.

Provide your analysis in a JSON format with this structure:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": number (0-100),
  "entryPrice": number (MUST be provided - recommended entry price based on current market),
  "stopLoss": number (MUST be provided - stop loss price for risk management),
  "takeProfit": number (MUST be provided - take profit price for profit taking),
  "riskRewardRatio": number (ratio of potential profit vs risk, e.g., 2.5),
  "reasoning": "string (detailed explanation of your analysis)",
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
        'HTTP-Referer': 'http://localhost:3000',
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
