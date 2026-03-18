'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Layout';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';
import { formatPrice, formatPercentage, formatCompactNumber } from '@/utils/formatters';
import { clsx } from 'clsx';

export default function MarketsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { coins, loading, selectedCoin } = useAppSelector((state) => state.market);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change24h' | 'marketCap'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  const handleSelectCoin = (symbol: string) => {
    dispatch(setSelectedCoin(symbol));
  };

  const filteredCoins = coins
    .filter(coin => 
      coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'change24h':
          comparison = a.change24h - b.change24h;
          break;
        case 'marketCap':
          comparison = a.marketCap - b.marketCap;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (column: 'rank' | 'price' | 'change24h' | 'marketCap') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleRefresh = () => {
    dispatch({ type: 'market/fetchMarketData' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Markets</h1>
            <p className="text-[#64748b]">Cryptocurrency market overview</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] rounded-lg hover:bg-[#2d2d3a] transition-colors"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search coins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#12121a] border border-[#2d2d3a] rounded-lg pl-10 pr-4 py-2 text-white placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
        </div>

        <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2d2d3a]">
                  <th className="text-left p-4 text-sm font-medium text-[#64748b]">#</th>
                  <th className="text-left p-4 text-sm font-medium text-[#64748b]">Coin</th>
                  <th 
                    className="text-right p-4 text-sm font-medium text-[#64748b] cursor-pointer hover:text-white"
                    onClick={() => handleSort('price')}
                  >
                    Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-right p-4 text-sm font-medium text-[#64748b] cursor-pointer hover:text-white"
                    onClick={() => handleSort('change24h')}
                  >
                    24h Change {sortBy === 'change24h' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-right p-4 text-sm font-medium text-[#64748b] cursor-pointer hover:text-white"
                    onClick={() => handleSort('marketCap')}
                  >
                    Market Cap {sortBy === 'marketCap' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-[#64748b]">Volume (24h)</th>
                  <th className="text-right p-4 text-sm font-medium text-[#64748b]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.map((coin) => (
                  <tr
                    key={coin.symbol}
                    className={clsx(
                      'border-b border-[#2d2d3a] hover:bg-[#1a1a24] transition-colors cursor-pointer',
                      selectedCoin === coin.symbol && 'bg-[#1a1a24]'
                    )}
                    onClick={() => handleSelectCoin(coin.symbol)}
                  >
                    <td className="p-4 text-sm text-[#64748b]">{coin.rank}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-xs font-bold">
                          {coin.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{coin.name}</p>
                          <p className="text-sm text-[#64748b]">{coin.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">
                      ${formatPrice(coin.price)}
                    </td>
                    <td className="p-4 text-right">
                      <div className={clsx(
                        'flex items-center justify-end gap-1',
                        coin.change24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                      )}>
                        {coin.change24h >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {formatPercentage(coin.change24h)}
                      </div>
                    </td>
                    <td className="p-4 text-right text-sm">
                      ${formatCompactNumber(coin.marketCap)}
                    </td>
                    <td className="p-4 text-right text-sm text-[#94a3b8]">
                      ${formatCompactNumber(coin.volume24h)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setSelectedCoin(coin.symbol));
                          router.push('/trading');
                        }}
                        className="px-3 py-1 text-xs bg-[#3b82f6] rounded hover:bg-[#2563eb] transition-colors"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
