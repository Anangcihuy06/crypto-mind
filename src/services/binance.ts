import axios from 'axios';
import type { CandleData } from '@/types';
import { TIMEFRAME_INTERVALS } from '@/utils/constants';
import type { Timeframe } from '@/types';

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

export async function fetchKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 200
): Promise<CandleData[]> {
  try {
    const cleanSymbol = symbol.replace('/', '').replace('USDT', '');
    const interval = TIMEFRAME_INTERVALS[timeframe];
    
    const response = await api.get(`/api/candles?symbol=${cleanSymbol}&timeframe=${interval}`);
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching klines:', error);
    throw error;
  }
}

export async function fetch24hrTicker(symbol: string): Promise<any> {
  try {
    const cleanSymbol = symbol.replace('/', '').replace('USDT', '');
    const response = await api.get(`/api/candles?symbol=${cleanSymbol}&timeframe=1h`);
    return response.data;
  } catch (error) {
    console.error('Error fetching 24hr ticker:', error);
    throw error;
  }
}

export async function fetchTicker(symbol: string): Promise<{ price: number }> {
  try {
    const cleanSymbol = symbol.replace('/', '').replace('USDT', '');
    const response = await api.get(`/api/candles?symbol=${cleanSymbol}&timeframe=1h`);
    const candles = response.data;
    if (candles && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      return { price: parseFloat(lastCandle.close) };
    }
    throw new Error('No ticker data available');
  } catch (error) {
    console.error('Error fetching ticker:', error);
    throw error;
  }
}

export async function fetchOrderBook(symbol: string, limit: number = 20): Promise<any> {
  try {
    const response = await axios.get(`${BINANCE_BASE_URL}/depth`, {
      params: {
        symbol: symbol.replace('/', ''),
        limit,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching order book:', error);
    throw error;
  }
}

export async function fetchMultipleTickers(symbols: string[]): Promise<any[]> {
  try {
    const promises = symbols.map(symbol => fetch24hrTicker(symbol));
    return Promise.all(promises);
  } catch (error) {
    console.error('Error fetching multiple tickers:', error);
    throw error;
  }
}

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

export interface KlineData {
  symbol: string;
  timeframe: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type TickerCallback = (data: TickerData) => void;
type KlineCallback = (data: KlineData) => void;

class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private subscriptions: Map<string, TickerCallback> = new Map();
  private symbols: string[] = [];
  private isConnected = false;
  private isIntentionalClose = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(symbols: string[]) {
    this.symbols = symbols;
    this.reconnectAttempts = 0;
    this.isIntentionalClose = false;
    this.createConnection();
  }

  private createConnection() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const streams = this.symbols.map((s: string) => `${s.toLowerCase()}usdt@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data) {
            const ticker = message.data;
            const symbol = ticker.s.replace('USDT', '');
            const data: TickerData = {
              symbol,
              price: parseFloat(ticker.c),
              change24h: parseFloat(ticker.P),
              high24h: parseFloat(ticker.h),
              low24h: parseFloat(ticker.l),
              volume: parseFloat(ticker.v),
            };
            
            const callback = this.subscriptions.get(symbol);
            if (callback) {
              callback(data);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        if (!this.isIntentionalClose) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isIntentionalClose) {
      return;
    }
    
    if (this.reconnectTimeout) return;
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.symbols.length > 0 && !this.isIntentionalClose) {
        this.createConnection();
      }
    }, this.reconnectDelay);
  }

  subscribe(symbol: string, callback: TickerCallback) {
    this.subscriptions.set(symbol, callback);
  }

  unsubscribe(symbol: string) {
    this.subscriptions.delete(symbol);
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.symbols = [];
    this.subscriptions.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export const binanceWS = new BinanceWebSocket();

class KlineWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, KlineCallback> = new Map();
  private currentSymbol: string = '';
  private currentTimeframe: string = '';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionalClose = false;

  connect(symbol: string, timeframe: string) {
    if (this.currentSymbol === symbol && this.currentTimeframe === timeframe && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnect();
    this.isIntentionalClose = false;
    this.currentSymbol = symbol;
    this.currentTimeframe = timeframe;
    this.reconnectAttempts = 0;

    this.createConnection();
  }

  private createConnection() {
    const stream = `${this.currentSymbol.toLowerCase()}usdt@kline_${this.currentTimeframe}`;
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${stream}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Kline WebSocket connected:', stream);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data && message.data.k) {
            const kline = message.data.k;
            const data: KlineData = {
              symbol: kline.s.replace('USDT', ''),
              timeframe: kline.i,
              time: Math.floor(kline.t / 1000),
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
              volume: parseFloat(kline.v),
            };

            const callback = this.subscriptions.get(this.currentSymbol);
            if (callback) {
              callback(data);
            }
          }
        } catch (error) {
          console.error('Error parsing kline message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Kline WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Kline WebSocket disconnected');
        if (!this.isIntentionalClose) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating Kline WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached for Kline WebSocket');
      return;
    }
    
    if (this.reconnectTimeout) return;
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect Kline WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.currentSymbol && this.currentTimeframe && !this.isIntentionalClose) {
        this.createConnection();
      }
    }, 3000);
  }

  subscribe(symbol: string, callback: KlineCallback) {
    this.subscriptions.set(symbol, callback);
  }

  unsubscribe(symbol: string) {
    this.subscriptions.delete(symbol);
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentSymbol = '';
    this.currentTimeframe = '';
    this.subscriptions.clear();
  }
}

export const klineWS = new KlineWebSocket();

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
