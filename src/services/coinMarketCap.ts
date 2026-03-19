import axios from 'axios';
import type { Coin, PriceData } from '@/types';

interface CMCCoinResponse {
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

interface CMCApiResponse {
  data?: CMCCoinResponse[];
  error?: string;
}

const getBaseURL = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export async function fetchMarketData(limit: number = 50): Promise<Coin[]> {
  try {
    const response = await api.get<CMCApiResponse>('/api/market');
    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.data) {
      throw new Error('No data returned from API');
    }

    return data.data.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      slug: item.slug,
      rank: item.cmc_rank || 0,
      price: item.quote.USD.price,
      change24h: item.quote.USD.percent_change_24h,
      change7d: item.quote.USD.percent_change_7d ?? 0,
      marketCap: item.quote.USD.market_cap,
      volume24h: item.quote.USD.volume_24h,
      circulatingSupply: item.circulating_supply,
      totalSupply: item.total_supply,
      maxSupply: item.max_supply,
      lastUpdated: item.last_updated,
    }));
  } catch (error) {
    console.error('Error fetching market data:', error);
    throw error;
  }
}

export async function fetchPriceData(symbols: string[]): Promise<Record<string, PriceData>> {
  try {
    const response = await api.get<CMCApiResponse>('/api/market');
    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    const result: Record<string, PriceData> = {};
    const priceMap = new Map<string, PriceData>();
    
    if (data.data) {
      data.data.forEach((item) => {
        priceMap.set(item.symbol, {
          symbol: item.symbol,
          price: item.quote.USD.price,
          change24h: item.quote.USD.percent_change_24h,
          change7d: item.quote.USD.percent_change_7d ?? 0,
          high24h: item.quote.USD.price * 1.1,
          low24h: item.quote.USD.price * 0.9,
          volume24h: item.quote.USD.volume_24h,
          marketCap: item.quote.USD.market_cap,
        });
      });

      symbols.forEach(symbol => {
        if (priceMap.has(symbol)) {
          result[symbol] = priceMap.get(symbol)!;
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching price data:', error);
    throw error;
  }
}

export async function fetchCoinInfo(symbol: string): Promise<CMCCoinResponse | undefined> {
  try {
    const response = await api.get<CMCApiResponse>('/api/market');
    const data = response.data;
    
    if (data.data) {
      return data.data.find((c) => c.symbol === symbol);
    }
    return undefined;
  } catch (error) {
    console.error('Error fetching coin info:', error);
    throw error;
  }
}

export async function fetchGlobalData(): Promise<null> {
  return null;
}
