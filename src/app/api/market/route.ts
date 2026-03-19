import { NextResponse } from 'next/server';

const CMC_API = 'https://pro-api.coinmarketcap.com/v1';

let marketCache: { data: unknown; timestamp: number } | null = null;
const CACHE_DURATION = 60000;

interface CoinMarketCapItem {
  id: number;
  symbol: string;
  name: string;
  slug: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
      percent_change_7d?: number;
      market_cap: number;
      volume_24h: number;
    };
  };
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
}

export async function GET() {
  if (marketCache && Date.now() - marketCache.timestamp < CACHE_DURATION) {
    console.log('[Cache] Market data hit');
    return NextResponse.json(marketCache.data);
  }

  try {
    const apiKey = process.env.CMC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'CMC_API_KEY not configured. Please set CMC_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${CMC_API}/cryptocurrency/listings/latest?limit=50&convert=USD`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CMC API error:', response.status, errorText);
      if (marketCache) {
        console.log('[Cache] CMC error fallback to cache');
        return NextResponse.json(marketCache.data);
      }
      return NextResponse.json(
        { error: `CoinMarketCap API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const result: { data: CoinMarketCapItem[] } = { data: data.data || [] };

    marketCache = { data: result, timestamp: Date.now() };
    console.log('[Market API] Fetched', result.data.length, 'coins from CoinMarketCap');
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Market API error:', error);
    if (marketCache) {
      console.log('[Cache] Error fallback to cache');
      return NextResponse.json(marketCache.data);
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
