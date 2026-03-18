'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Layout';
import { PriceChart } from '@/components/chart/PriceChart';
import { OrderForm } from '@/components/trading/OrderForm';
import { PositionsList } from '@/components/trading/PositionsList';
import { AISignalCard } from '@/components/dashboard/AISignalCard';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';
import { formatPrice, formatPercentage, formatDate } from '@/utils/formatters';
import { clsx } from 'clsx';
import type { SignalType } from '@/types';

export default function TradingPage() {
  const dispatch = useAppDispatch();
  const { coins, selectedCoin, prices } = useAppSelector((state) => state.market);
  const { paperBalance, positions, totalPnL, totalPnLPercentage } = useAppSelector((state) => state.portfolio);
  const { history } = useAppSelector((state) => state.signals);
  
  const [filterType, setFilterType] = useState<SignalType | 'all'>('all');
  
  useEffect(() => {
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  const selectedCoinData = coins.find(c => c.symbol === selectedCoin);
  const currentPrice = prices[selectedCoin] || 0;

  const totalPositionsValue = positions.reduce((acc, pos) => acc + pos.value, 0);
  const totalValue = paperBalance + totalPositionsValue;

  const filteredHistory = history
    .filter(signal => filterType === 'all' || signal.type === filterType)
    .slice(0, 15);

  const closedSignals = history.filter(s => s.status === 'CLOSED');
  const wins = closedSignals.filter(s => s.result === 'WIN').length;
  const losses = closedSignals.filter(s => s.result === 'LOSS').length;
  const breakeven = closedSignals.filter(s => s.result === 'BREAKEVEN').length;
  const total = closedSignals.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  
  const signalStats = { wins, losses, breakeven, total, winRate };

  const getSignalColor = (type: SignalType) => {
    if (type === 'BUY') return 'text-[#00d26a] bg-[#00d26a]/10';
    if (type === 'SELL') return 'text-[#ff3b30] bg-[#ff3b30]/10';
    return 'text-[#fbbf24] bg-[#fbbf24]/10';
  };

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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] overflow-hidden h-full">
                <AISignalCard />
              </div>
              
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4 h-full flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-lg font-semibold">Signal History</h3>
                  <div className="flex items-center gap-3">
                    {signalStats.total > 0 && (
                      <span className="text-xs text-[#64748b]">
                        <span className={signalStats.winRate >= 50 ? 'text-[#00d26a]' : 'text-[#ff3b30]'}>
                          {signalStats.winRate}%
                        </span>
                        {' '}({signalStats.wins}W/{signalStats.losses}L/{signalStats.breakeven}B)
                      </span>
                    )}
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as SignalType | 'all')}
                      className="bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="all">All</option>
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                      <option value="HOLD">HOLD</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                  {filteredHistory.length === 0 ? (
                    <p className="text-[#64748b] text-center py-4">No signals yet</p>
                  ) : (
                    filteredHistory.map((signal) => (
                      <div
                        key={signal.id}
                        className="bg-[#1a1a24] p-3 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{signal.symbol}</span>
                            {signal.status === 'CLOSED' && (
                              <span className={clsx(
                                'text-xs px-1.5 py-0.5 rounded',
                                signal.result === 'WIN' ? 'bg-[#00d26a]/20 text-[#00d26a]' :
                                signal.result === 'LOSS' ? 'bg-[#ff3b30]/20 text-[#ff3b30]' :
                                'bg-[#fbbf24]/20 text-[#fbbf24]'
                              )}>
                                {signal.result}
                              </span>
                            )}
                          </div>
                          <div className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            getSignalColor(signal.type)
                          )}>
                            {signal.type}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#64748b]">
                          <span>{signal.timeframe}</span>
                          <span>{signal.confidence}%</span>
                          <span>{formatDate(signal.createdAt)}</span>
                        </div>
                        {signal.status === 'PENDING' && (
                          <div className="text-xs text-[#8b5cf6] mt-1">
                            Pending evaluation
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
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
