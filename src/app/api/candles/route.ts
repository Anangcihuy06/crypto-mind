import { NextResponse } from 'next/server';

const CRYPTOCOMPARE_API = 'https://min-api.cryptocompare.com/data/v2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC';
    const timeframe = searchParams.get('timeframe') || '1h';
    
    const limit = 200;
    const aggregate = getAggregateFromTimeframe(timeframe);
    
    const response = await fetch(
      `${CRYPTOCOMPARE_API}/histohour?fsym=${symbol}&tsym=USD&limit=${limit}&aggregate=${aggregate}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `CryptoCompare API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    if (!result.Data?.Data) {
      return NextResponse.json(
        { error: 'Invalid response from CryptoCompare' },
        { status: 500 }
      );
    }
    
    const candles = result.Data.Data.map((item: any) => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volumefrom || 0,
    }));

    return NextResponse.json(candles);
  } catch (error: any) {
    console.error('Candle API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch candle data' },
      { status: 500 }
    );
  }
}

function getAggregateFromTimeframe(timeframe: string): number {
  switch (timeframe) {
    case '1h':
      return 1;
    case '4h':
      return 4;
    case '1d':
      return 24;
    case '1w':
      return 168;
    default:
      return 1;
  }
}
