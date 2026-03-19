import { NextResponse } from 'next/server';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

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

const TIMEFRAME_INTERVAL: Record<string, string> = {
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
  '1W': '1w',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

const BINANCE_CANDLES_INTERVAL: Record<string, number> = {
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080,
};

interface BinanceKline {
  0: number;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: number;
  7: string;
  8: number;
  9: string;
  10: string;
  11: string;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const candlesCache: Map<string, { data: CandleData[]; timestamp: number }> = new Map();
const CACHE_DURATION = 60000;

async function fetchWithTimeout(url: string, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    let symbol = searchParams.get('symbol') || 'BTC';
    const timeframe = searchParams.get('timeframe') || '1H';
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    symbol = symbol.replace('/', '').replace('USDT', '').toUpperCase();
    const cacheKey = `${symbol}-${timeframe}`;
    
    const cached = candlesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('[Cache] Candles hit:', cacheKey);
      return NextResponse.json(cached.data);
    }

    const binanceSymbol = BINANCE_SYMBOL_MAP[symbol] || `${symbol.toLowerCase()}usdt`;
    const interval = TIMEFRAME_INTERVAL[timeframe] || '1h';
    
    const wsUrl = `${BINANCE_WS_URL}/${binanceSymbol}@kline_${interval}`;
    console.log('[Candles WS] Fetching historical candles from:', wsUrl);

    return new Promise((resolve) => {
      const ws = new WebSocket(wsUrl);
      const klines: BinanceKline[] = [];
      let timeout: ReturnType<typeof setTimeout>;
      let resolved = false;

      const sendResult = (data: BinanceKline[]) => {
        if (resolved) return;
        resolved = true;
        
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        clearTimeout(timeout);

        const candles = data.map((item) => ({
          time: Math.floor(item[0] / 1000),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        }));

        candles.sort((a, b) => a.time - b.time);

        if (candles.length > limit) {
          candles.length = limit;
        }

        candlesCache.set(cacheKey, { data: candles, timestamp: Date.now() });
        console.log('[Candles WS] Returning', candles.length, 'candles for', symbol, timeframe);
        resolve(NextResponse.json(candles));
      };

      timeout = setTimeout(() => {
        console.log('[Candles WS] Timeout, returning collected candles:', klines.length);
        sendResult(klines);
      }, 8000);

      ws.onopen = () => {
        console.log('[Candles WS] Connected, waiting for historical data...');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'kline' && msg.k) {
            const kline = msg.k;
            
          if (!kline.x) {
            klines.push(kline as unknown as BinanceKline);
          } else if (klines.length === 0) {
              klines.push(kline as unknown as BinanceKline);
              sendResult(klines);
            }

            if (klines.length >= limit) {
              console.log('[Candles WS] Collected enough candles:', klines.length);
              sendResult(klines);
            }
          }
        } catch (error) {
          console.error('[Candles WS] Parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Candles WS] Error:', error);
        if (!resolved) {
          resolve(NextResponse.json(
            { error: 'WebSocket connection failed' },
            { status: 500 }
          ));
        }
      };

      ws.onclose = () => {
        console.log('[Candles WS] Closed');
        if (!resolved) {
          if (klines.length > 0) {
            sendResult(klines);
          } else {
            resolve(NextResponse.json(
              { error: 'No candles received' },
              { status: 500 }
            ));
          }
        }
      };
    });
  } catch (error: unknown) {
    console.error('Klines API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch klines data' },
      { status: 500 }
    );
  }
}
