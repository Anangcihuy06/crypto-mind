'use client';

import { useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowDown, ArrowUp, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Layout';
import { PriceChart } from '@/components/chart/PriceChart';
import { OrderForm } from '@/components/trading/OrderForm';
import { PositionsList } from '@/components/trading/PositionsList';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';
import { formatPrice, formatPercentage } from '@/utils/formatters';
import { clsx } from 'clsx';

export default function TradingPage() {
  const dispatch = useAppDispatch();
  const { coins, selectedCoin, prices } = useAppSelector((state) => state.market);
  const { paperBalance, positions, totalPnL, totalPnLPercentage } = useAppSelector((state) => state.portfolio);

  useEffect(() => {
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  const selectedCoinData = coins.find(c => c.symbol === selectedCoin);
  const currentPrice = prices[selectedCoin] || 0;

  const totalPositionsValue = positions.reduce((acc, pos) => acc + pos.value, 0);
  const totalValue = paperBalance + totalPositionsValue;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trading</h1>
            <p className="text-[#64748b]">Paper trading with $10,000 virtual balance</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-[#64748b]">Total Portfolio</p>
              <p className="text-xl font-bold">${formatPrice(totalValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#64748b]">Unrealized P&L</p>
              <div className="flex items-center gap-1">
                {totalPnL >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-[#00d26a]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#ff3b30]" />
                )}
                <span className={clsx(
                  'font-bold',
                  totalPnL >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                )}>
                  {totalPnL >= 0 ? '+' : ''}${formatPrice(totalPnL)}
                </span>
                <span className={clsx(
                  'text-sm',
                  totalPnLPercentage >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                )}>
                  ({formatPercentage(totalPnLPercentage)})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
          {coins.slice(0, 10).map(coin => (
            <button
              key={coin.symbol}
              onClick={() => dispatch(setSelectedCoin(coin.symbol))}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors',
                selectedCoin === coin.symbol
                  ? 'bg-[#8b5cf6] text-white'
                  : 'bg-[#12121a] hover:bg-[#1a1a24]'
              )}
            >
              <span className="font-medium">{coin.symbol}</span>
              <span className={clsx(
                'text-sm',
                coin.change24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
              )}>
                {formatPercentage(coin.change24h)}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <PriceChart />
            
            {selectedCoinData && (
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6">
                <h3 className="text-lg font-semibold mb-4">{selectedCoinData.name} Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Current Price</p>
                    <p className="text-xl font-bold">${formatPrice(currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">24h Change</p>
                    <p className={clsx(
                      'text-xl font-bold',
                      selectedCoinData.change24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                    )}>
                      {formatPercentage(selectedCoinData.change24h)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">24h High</p>
                    <p className="text-xl font-bold">${formatPrice(currentPrice * 1.05)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">24h Low</p>
                    <p className="text-xl font-bold">${formatPrice(currentPrice * 0.95)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Market Cap</p>
                    <p className="text-xl font-bold">${(selectedCoinData.marketCap / 1e9).toFixed(2)}B</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Volume (24h)</p>
                    <p className="text-xl font-bold">${(selectedCoinData.volume24h / 1e9).toFixed(2)}B</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Circulating Supply</p>
                    <p className="text-xl font-bold">{selectedCoinData.circulatingSupply.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Rank</p>
                    <p className="text-xl font-bold">#{selectedCoinData.rank}</p>
                  </div>
                </div>
              </div>
            )}

            <PositionsList />
          </div>

          <div>
            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold">Balance</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Available</span>
                  <span className="font-bold text-[#3b82f6]">${formatPrice(paperBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">In Positions</span>
                  <span className="font-bold">${formatPrice(totalPositionsValue)}</span>
                </div>
                <div className="pt-3 border-t border-[#2d2d3a] flex justify-between">
                  <span className="text-[#64748b]">Total</span>
                  <span className="font-bold">${formatPrice(totalValue)}</span>
                </div>
              </div>
            </div>

            <OrderForm />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
