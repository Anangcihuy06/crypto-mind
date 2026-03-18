'use client';

import { useEffect } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin, updatePrice } from '@/store/slices/marketSlice';
import { updatePositionsPrices } from '@/store/slices/portfolioSlice';
import { formatPrice, formatPercentage } from '@/utils/formatters';
import { clsx } from 'clsx';

export function Sidebar() {
  const dispatch = useAppDispatch();
  const { coins, selectedCoin, prices } = useAppSelector((state) => state.market);

  useEffect(() => {
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  useEffect(() => {
    if (coins.length === 0) return;

    const STABLECOINS = ['USDT', 'USDC', 'DAI', 'USDe', 'BUSD', 'USDD', 'TUSD', 'USDP'];
    const filteredCoins = coins.filter(c => {
      const symbol = c.symbol;
      return (
        !STABLECOINS.includes(symbol) &&
        symbol.length >= 2 &&
        symbol.length <= 10 &&
        /^[A-Z]+$/.test(symbol)
      );
    });
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isIntentionalClose = false;

    const connect = () => {
      if (ws?.readyState === WebSocket.OPEN) return;
      
      const symbols = filteredCoins.slice(0, 15).map(c => `${c.symbol.toLowerCase()}usdt@ticker`).join('/');
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${symbols}`;
      
      console.log('Connecting WebSocket from Sidebar...', wsUrl);
      
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        console.error('WebSocket creation failed:', err);
        return;
      }
      
      ws.onopen = () => {
        console.log('WebSocket connected from Sidebar');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data) {
            const ticker = message.data;
            const symbol = ticker.s.replace('USDT', '');
            const price = parseFloat(ticker.c);
            const change24h = parseFloat(ticker.P);
            
            dispatch(updatePrice({ symbol, price, change24h }));
            dispatch(updatePositionsPrices({ [symbol]: price }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected from Sidebar', event.code, event.reason);
        if (!isIntentionalClose) {
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      isIntentionalClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, [coins, dispatch]);

  const topGainers = [...coins]
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 5);

  const topLosers = [...coins]
    .sort((a, b) => a.change24h - b.change24h)
    .slice(0, 5);

  const handleSelectCoin = (symbol: string) => {
    dispatch(setSelectedCoin(symbol));
  };

  const getPrice = (symbol: string) => {
    return prices[symbol] || coins.find(c => c.symbol === symbol)?.price || 0;
  };

  const getChange = (symbol: string) => {
    return prices[symbol] ? coins.find(c => c.symbol === symbol)?.change24h || 0 : 0;
  };

  return (
    <aside className="w-64 bg-[#12121a] border-r border-[#2d2d3a] flex flex-col h-[calc(100vh-64px)]">
      <div className="p-4 border-b border-[#2d2d3a] shrink-0" style={{ minHeight: '180px' }}>
        <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          Top Gainers
        </h2>
        <div className="space-y-2">
          {topGainers.map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => handleSelectCoin(coin.symbol)}
              className={clsx(
                'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                selectedCoin === coin.symbol
                  ? 'bg-[#1a1a24] border border-[#2d2d3a]'
                  : 'hover:bg-[#1a1a24]'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{coin.symbol}</span>
              </div>
              <div className="flex items-center gap-1 text-[#00d26a]">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs">{formatPercentage(getChange(coin.symbol))}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-[#2d2d3a] shrink-0" style={{ minHeight: '180px' }}>
        <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          Top Losers
        </h2>
        <div className="space-y-2">
          {topLosers.map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => handleSelectCoin(coin.symbol)}
              className={clsx(
                'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                selectedCoin === coin.symbol
                  ? 'bg-[#1a1a24] border border-[#2d2d3a]'
                  : 'hover:bg-[#1a1a24]'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{coin.symbol}</span>
              </div>
              <div className="flex items-center gap-1 text-[#ff3b30]">
                <TrendingDown className="w-3 h-3" />
                <span className="text-xs">{formatPercentage(getChange(coin.symbol))}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 shrink-0" style={{ minHeight: '200px' }}>
        <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          Watchlist (Top 5)
        </h2>
        <div className="space-y-1">
          {coins.slice(0, 5).map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => handleSelectCoin(coin.symbol)}
              className={clsx(
                'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                selectedCoin === coin.symbol
                  ? 'bg-[#1a1a24] border border-[#8b5cf6]'
                  : 'hover:bg-[#1a1a24]'
              )}
            >
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 text-[#fbbf24]" />
                <span className="text-sm font-medium">{coin.symbol}</span>
              </div>
              <span className="text-sm text-[#f8fafc]">${formatPrice(getPrice(coin.symbol))}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
