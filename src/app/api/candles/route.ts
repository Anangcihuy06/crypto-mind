import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC';
    const timeframe = searchParams.get('timeframe') || '1h';

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${timeframe}&limit=200`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Binance API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const candles = data.map((kline: any[]) => ({
      time: Math.floor(kline[0] / 1000),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }));

    return NextResponse.json(candles);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch candle data' },
      { status: 500 }
    );
  }
}
