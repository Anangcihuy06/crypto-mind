import type { CandleData } from '@/types';
import type { Timeframe } from '@/types';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

export interface KlineData {
  symbol: string;
  timeframe: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
}

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

type TickerCallback = (data: TickerData) => void;
type KlineCallback = (data: KlineData) => void;

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  'BTC': 'btcusdt',
  'ETH': 'ethusdt',
  'BNB': 'bnbusdt',
  'SOL': 'solusdt',
  'XRP': 'xrpusdt',
  'ADA': 'adausdt',
  'DOGE': 'dogeusdt',
  'TRX': 'trxusdt',
  'AVAX': 'avaxusdt',
  'DOT': 'dotusdt',
  'LINK': 'linkusdt',
  'MATIC': 'maticusdt',
  'SHIB': 'shibusdt',
  'LTC': 'ltcusdt',
  'ATOM': 'atomusdt',
  'UNI': 'uniusdt',
  'XLM': 'xlmusdt',
  'ETC': 'etcusdt',
  'FIL': 'filusdt',
};

class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Map<string, TickerCallback> = new Map();
  private symbols: string[] = [];
  private status: WsConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: WsConnectionStatus, error?: string) => void> = new Set();

  getStatus(): WsConnectionStatus {
    return this.status;
  }

  onStatusChange(callback: (status: WsConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus(status: WsConnectionStatus, error?: string) {
    this.status = status;
    this.statusListeners.forEach(cb => cb(status, error));
  }

  connect(symbols: string[]) {
    this.symbols = symbols;
    this.reconnectAttempts = 0;
    this.cleanup();
    this.createConnection();
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private createConnection() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const streams = this.symbols
      .filter(s => BINANCE_SYMBOL_MAP[s])
      .map(s => `${BINANCE_SYMBOL_MAP[s]}@ticker`);

    if (streams.length === 0) {
      console.error('[Binance WS] No valid symbols to subscribe');
      this.notifyStatus('error', 'No valid symbols');
      return;
    }

    const wsUrl = `${BINANCE_WS_URL}/${streams.join('/')}`;
    console.log('[Binance WS] Connecting with', streams.length, 'streams...');

    this.notifyStatus('connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Binance WS] Connected successfully');
        this.notifyStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (error) {
          console.error('[Binance WS] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Binance WS] Error:', error);
        this.notifyStatus('error', 'Connection error');
      };

      this.ws.onclose = (event) => {
        console.log('[Binance WS] Closed:', event.code);
        this.notifyStatus('disconnected');
        if (!event.wasClean) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('[Binance WS] Create error:', error);
      this.notifyStatus('error', 'Failed to create connection');
      this.attemptReconnect();
    }
  }

  private handleMessage(msg: { s?: string; c?: string; P?: string; h?: string; l?: string; v?: string }) {
    if (msg.s) {
      const symbol = msg.s.replace('USDT', '').toUpperCase();
      const tickerData: TickerData = {
        symbol,
        price: parseFloat(msg.c || '0') || 0,
        change24h: parseFloat(msg.P || '0') || 0,
        high24h: parseFloat(msg.h || '0') || 0,
        low24h: parseFloat(msg.l || '0') || 0,
        volume: parseFloat(msg.v || '0') || 0,
      };

      const callback = this.subscriptions.get(symbol);
      if (callback) {
        callback(tickerData);
      }
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Binance WS] Max reconnect attempts reached');
      this.notifyStatus('error', 'Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[Binance WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.symbols.length > 0) {
        this.createConnection();
      }
    }, delay);
  }

  subscribe(symbol: string, callback: TickerCallback) {
    this.subscriptions.set(symbol, callback);
  }

  unsubscribe(symbol: string) {
    this.subscriptions.delete(symbol);
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.cleanup();
    this.symbols = [];
    this.subscriptions.clear();
    this.notifyStatus('disconnected');
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

export const binanceWS = new BinanceWebSocket();

const BINANCE_INTERVAL_MAP: Record<string, string> = {
  '1h': '1h',
  '1H': '1h',
  '4h': '4h',
  '4H': '4h',
  '1d': '1d',
  '1D': '1d',
  '1w': '1w',
  '1W': '1w',
};

class KlineWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, KlineCallback> = new Map();
  private currentSymbol: string = '';
  private currentTimeframe: string = '';
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private status: WsConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: WsConnectionStatus, error?: string) => void> = new Set();
  private isIntentionalClose = false;

  getStatus(): WsConnectionStatus {
    return this.status;
  }

  onStatusChange(callback: (status: WsConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus(status: WsConnectionStatus, error?: string) {
    this.status = status;
    this.statusListeners.forEach(cb => cb(status, error));
  }

  connect(symbol: string, timeframe: string) {
    if (this.currentSymbol === symbol && this.currentTimeframe === timeframe && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.cleanup();
    this.isIntentionalClose = false;
    this.currentSymbol = symbol;
    this.currentTimeframe = timeframe;
    this.reconnectAttempts = 0;

    this.createConnection();
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private createConnection() {
    const binanceSymbol = BINANCE_SYMBOL_MAP[this.currentSymbol] || `${this.currentSymbol.toLowerCase()}usdt`;
    const interval = BINANCE_INTERVAL_MAP[this.currentTimeframe] || '1h';

    const wsUrl = `${BINANCE_WS_URL}/${binanceSymbol}@kline_${interval}`;
    console.log('[KlineWS] Connecting to Binance:', binanceSymbol, interval);

    this.notifyStatus('connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[KlineWS] Connected:', binanceSymbol);
        this.notifyStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'kline' && msg.k) {
            const kline = msg.k;
            const klineData: KlineData = {
              symbol: this.currentSymbol,
              timeframe: this.currentTimeframe,
              time: Math.floor(kline.t / 1000),
              open: parseFloat(kline.o) || 0,
              high: parseFloat(kline.h) || 0,
              low: parseFloat(kline.l) || 0,
              close: parseFloat(kline.c) || 0,
              volume: parseFloat(kline.v) || 0,
              isFinal: kline.x,
            };

            const callback = this.subscriptions.get(this.currentSymbol);
            if (callback) {
              callback(klineData);
            }
          }
        } catch (error) {
          console.error('[KlineWS] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[KlineWS] Error:', error);
        this.notifyStatus('error', 'Kline connection error');
      };

      this.ws.onclose = (event) => {
        console.log('[KlineWS] Closed:', event.code);
        this.notifyStatus('disconnected');
        if (!this.isIntentionalClose && !event.wasClean) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('[KlineWS] Create error:', error);
      this.notifyStatus('error', 'Failed to create kline connection');
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[KlineWS] Max reconnect attempts reached');
      this.notifyStatus('error', 'Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[KlineWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.currentSymbol && this.currentTimeframe && !this.isIntentionalClose) {
        this.createConnection();
      }
    }, delay);
  }

  subscribe(symbol: string, callback: KlineCallback) {
    this.subscriptions.set(symbol, callback);
  }

  unsubscribe(symbol: string) {
    this.subscriptions.delete(symbol);
  }

  disconnect() {
    this.isIntentionalClose = true;
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.cleanup();
    this.currentSymbol = '';
    this.currentTimeframe = '';
    this.subscriptions.clear();
    this.notifyStatus('disconnected');
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

export const klineWS = new KlineWebSocket();

const CACHE_DURATION = 60000;
const klinesCache: Map<string, { data: CandleData[]; timestamp: number }> = new Map();
const tickerCache: Map<string, { data: TickerData[]; timestamp: number }> = new Map();

const getAppBaseURL = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export async function fetchKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 200
): Promise<CandleData[]> {
  const cleanSymbol = symbol.replace('/', '').replace('USDT', '').toUpperCase();
  const cacheKey = `${cleanSymbol}-${timeframe}`;
  
  const cached = klinesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[Cache] Klines hit:', cacheKey);
    return cached.data;
  }
  
  try {
    const response = await fetch(
      `${getAppBaseURL()}/api/candles?symbol=${cleanSymbol}&timeframe=${timeframe}&limit=${limit}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      if (cached) {
        console.log('[Cache] Klines fallback to cache:', cacheKey);
        return cached.data;
      }
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const candles = await response.json();

    if (!Array.isArray(candles)) {
      throw new Error('Invalid response');
    }

    klinesCache.set(cacheKey, { data: candles, timestamp: Date.now() });
    return candles;
  } catch (error) {
    console.error('Error fetching klines:', error);
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

interface CMCCoinData {
  symbol: string;
  quote?: {
    USD?: {
      price: number;
      percent_change_24h?: number;
      volume_24h?: number;
    };
  };
}

export async function fetch24hrTicker(symbol: string): Promise<TickerData> {
  const cleanSymbol = symbol.replace('/', '').replace('USDT', '').toUpperCase();
  
  try {
    const response = await fetch(
      `${getAppBaseURL()}/api/market`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const marketData: CMCCoinData[] = data.data || [];
    const coin = marketData.find((c) => c.symbol === cleanSymbol);

    if (!coin) {
      throw new Error(`No data for ${cleanSymbol}`);
    }

    return {
      symbol: cleanSymbol,
      price: coin.quote?.USD?.price || 0,
      change24h: coin.quote?.USD?.percent_change_24h || 0,
      high24h: (coin.quote?.USD?.price || 0) * 1.05,
      low24h: (coin.quote?.USD?.price || 0) * 0.95,
      volume: coin.quote?.USD?.volume_24h || 0,
    };
  } catch (error) {
    console.error('Error fetching 24hr ticker:', error);
    throw error;
  }
}

export async function fetchTicker(symbol: string): Promise<{ price: number }> {
  const ticker = await fetch24hrTicker(symbol);
  return { price: ticker.price };
}

export async function fetchOrderBook(_symbol: string): Promise<unknown> {
  try {
    const response = await fetch(
      `${getAppBaseURL()}/api/market`,
      { cache: 'no-store' }
    );
    return response.json();
  } catch (error) {
    console.error('Error fetching order book:', error);
    throw error;
  }
}

export async function fetchMultipleTickers(symbols: string[]): Promise<TickerData[]> {
  const cacheKey = symbols.slice(0, 10).sort().join(',');
  const cached = tickerCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 30000) {
    console.log('[Cache] Tickers hit:', cacheKey);
    return cached.data;
  }
  
  try {
    const response = await fetch(
      `${getAppBaseURL()}/api/market`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      if (cached) {
        console.log('[Cache] Tickers fallback to cache');
        return cached.data;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const marketData: CMCCoinData[] = data.data || [];
    const cleanSymbols = symbols.map(s => s.replace('/', '').replace('USDT', '').toUpperCase());
    
    const result = cleanSymbols.map((symbol) => {
      const coin = marketData.find((c) => c.symbol === symbol);
      if (coin && coin.quote?.USD) {
        return {
          symbol,
          price: coin.quote.USD.price || 0,
          change24h: coin.quote.USD.percent_change_24h || 0,
          high24h: (coin.quote.USD.price || 0) * 1.05,
          low24h: (coin.quote.USD.price || 0) * 0.95,
          volume: coin.quote.USD.volume_24h || 0,
        };
      }
      return {
        symbol,
        price: 0,
        change24h: 0,
        high24h: 0,
        low24h: 0,
        volume: 0,
      };
    });

    tickerCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Error fetching multiple tickers:', error);
    if (cached) {
      console.log('[Cache] Error fallback to cache');
      return cached.data;
    }
    throw error;
  }
}
