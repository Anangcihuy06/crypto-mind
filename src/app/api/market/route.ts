import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.CMC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CMC API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=50&convert=USD',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `CMC API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
