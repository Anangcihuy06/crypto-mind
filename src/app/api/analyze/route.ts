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

Provide your analysis in a JSON format with EXACT keys:
{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": number between 0-100,
  "entryPrice": number,
  "stopLoss": number,
  "takeProfit": number,
  "riskRewardRatio": number,
  "reasoning": "string explaining WHY this signal",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskLevel": "low" or "medium" or "high"
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, currentPrice } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    console.log('[Analyze API] ========== START ==========');
    console.log('[Analyze API] API Key exists:', !!apiKey);
    console.log('[Analyze API] Model:', AI_CONFIG.model);

    if (!apiKey) {
      console.error('[Analyze API] ERROR: Missing API key');
      return NextResponse.json(
        { 
          error: 'OpenRouter API key not configured', 
          fallback: true,
          reason: 'Missing OPENROUTER_API_KEY in environment'
        },
        { status: 500 }
      );
    }

    console.log('[Analyze API] Calling OpenRouter API...');
    
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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

    console.log('[Analyze API] Response status:', openRouterResponse.status);

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('[Analyze API] OpenRouter ERROR:', openRouterResponse.status, errorText);
      return NextResponse.json(
        { 
          error: `OpenRouter API error: ${openRouterResponse.status}`, 
          details: errorText,
          fallback: true
        },
        { status: openRouterResponse.status }
      );
    }

    const data = await openRouterResponse.json();
    console.log('[Analyze API] Response data received');
    
    const content = data.choices?.[0]?.message?.content || '';
    console.log('[Analyze API] Content length:', content.length);

    if (!content) {
      console.error('[Analyze API] Empty response from OpenRouter');
      return NextResponse.json(
        { 
          signal: 'HOLD',
          confidence: 50,
          reasoning: 'Empty response from AI',
          fallback: true
        },
        { status: 200 }
      );
    }

    try {
      let jsonStr = content.trim();
      
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?|```\n?/g, '').trim();
      }
      
      const analysis = JSON.parse(jsonStr);
      
      console.log('[Analyze API] Parsed:', analysis.signal, analysis.confidence);
      
      return NextResponse.json({
        ...analysis,
        model: AI_CONFIG.modelName,
        fromAI: true,
      });
    } catch (parseError) {
      console.error('[Analyze API] JSON parse error:', parseError);
      console.error('[Analyze API] Raw content:', content.substring(0, 500));
      return NextResponse.json({
        signal: 'HOLD',
        confidence: 50,
        reasoning: 'Could not parse AI response',
        keyFactors: ['Technical analysis'],
        riskLevel: 'medium',
        fallback: true,
        parseError: true,
      });
    }
  } catch (error) {
    console.error('[Analyze API] FATAL ERROR:', error);
    return NextResponse.json(
      { 
        error: (error as Error).message || 'Failed to analyze market',
        fallback: true
      },
      { status: 500 }
    );
  }
}
