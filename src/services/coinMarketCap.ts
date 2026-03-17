import axios from 'axios';
import type { Coin, CandleData, PriceData } from '@/types';

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

export async function fetchMarketData(limit: number = 50): Promise<Coin[]> {
  try {
    const response = await api.get(`/api/market`);
    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    return data.data.map((item: any) => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      slug: item.slug,
      rank: item.cmc_rank,
      price: item.quote.USD.price,
      change24h: item.quote.USD.percent_change_24h,
      change7d: item.quote.USD.percent_change_7d_including_last_updated_at ?? item.quote.USD.percent_change_7d ?? 0,
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
    const response = await api.get(`/api/market`);
    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    const result: Record<string, PriceData> = {};
    const priceMap = new Map();
    
    data.data.forEach((item: any) => {
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
        result[symbol] = priceMap.get(symbol);
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching price data:', error);
    throw error;
  }
}

export async function fetchCoinInfo(symbol: string): Promise<any> {
  try {
    const response = await api.get(`/api/market`);
    const data = response.data;
    
    const coin = data.data.find((c: any) => c.symbol === symbol);
    return coin;
  } catch (error) {
    console.error('Error fetching coin info:', error);
    throw error;
  }
}

export async function fetchGlobalData(): Promise<any> {
  return null;
}
