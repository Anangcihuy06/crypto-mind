import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert cryptocurrency trading analyst with deep knowledge of technical analysis, market psychology, and trading strategies. Your role is to analyze market data and provide clear, actionable trading signals with precise price levels.

When analyzing, consider:
1. Technical Indicators: RSI, MACD, Bollinger Bands, Moving Averages
2. Price Action: Trends, patterns, support/resistance
3. Market Context: Volume, market sentiment
4. Risk Management: Always calculate proper stop loss and take profit levels

Provide your analysis in a JSON format with this structure:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": number (0-100),
  "entryPrice": number (recommended entry price based on current market),
  "stopLoss": number (stop loss price for risk management),
  "takeProfit": number (take profit price for profit taking),
  "riskRewardRatio": number (ratio of potential profit vs risk, e.g., 2.5),
  "reasoning": "string",
  "keyFactors": ["string"],
  "riskLevel": "low" | "medium" | "high"
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Claude API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    try {
      const analysis = JSON.parse(content);
      return NextResponse.json(analysis);
    } catch {
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
