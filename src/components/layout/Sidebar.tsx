'use client';

import { useEffect } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';
import { formatPrice, formatPercentage } from '@/utils/formatters';
import { clsx } from 'clsx';

export function Sidebar() {
  const dispatch = useAppDispatch();
  const { coins, loading, selectedCoin } = useAppSelector((state) => state.market);

  useEffect(() => {
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  const topGainers = [...coins]
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 5);

  const topLosers = [...coins]
    .sort((a, b) => a.change24h - b.change24h)
    .slice(0, 5);

  const handleSelectCoin = (symbol: string) => {
    dispatch(setSelectedCoin(symbol));
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
                <span className="text-xs">{formatPercentage(coin.change24h)}</span>
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
                <span className="text-xs">{formatPercentage(coin.change24h)}</span>
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
              <span className="text-sm text-[#f8fafc]">${formatPrice(coin.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
