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

export default function TradingPage() {
  const dispatch = useAppDispatch();
  const { coins, selectedCoin, prices } = useAppSelector((state) => state.market);
  const { paperBalance, positions, totalPnL } = useAppSelector((state) => state.portfolio);
  const { history } = useAppSelector((state) => state.signals);
  
  const [filterType] = useState<'BUY' | 'SELL' | 'HOLD' | 'all'>('all');
  const [showOrderForm, setShowOrderForm] = useState(false);
  
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
    .slice(0, 10);

  const closedSignals = history.filter(s => s.status === 'CLOSED');
  const wins = closedSignals.filter(s => s.result === 'WIN').length;
  const losses = closedSignals.filter(s => s.result === 'LOSS').length;
  const total = closedSignals.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  
  const signalStats = { wins, losses, total, winRate };

  const getSignalColor = (type: 'BUY' | 'SELL' | 'HOLD') => {
    if (type === 'BUY') return 'text-[#00d26a] bg-[#00d26a]/10';
    if (type === 'SELL') return 'text-[#ff3b30] bg-[#ff3b30]/10';
    return 'text-[#fbbf24] bg-[#fbbf24]/10';
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Trading</h1>
            <p className="text-sm text-[#64748b] hidden sm:block">Paper trading with $10,000 virtual balance</p>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <div className="text-right shrink-0">
              <p className="text-xs text-[#64748b]">Portfolio</p>
              <p className="text-lg font-bold">${formatPrice(totalValue)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-[#64748b]">P&L</p>
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
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {coins.slice(0, 10).map(coin => (
            <button
              key={coin.symbol}
              onClick={() => dispatch(setSelectedCoin(coin.symbol))}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors active:scale-95',
                selectedCoin === coin.symbol
                  ? 'bg-[#8b5cf6] text-white'
                  : 'bg-[#12121a] hover:bg-[#1a1a24]'
              )}
            >
              <span className="font-medium text-sm">{coin.symbol}</span>
              <span className={clsx(
                'text-xs',
                coin.change24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
              )}>
                {formatPercentage(coin.change24h)}
              </span>
            </button>
          ))}
        </div>

        {/* PriceChart full width on mobile */}
        <PriceChart />

        {/* Desktop grid layout */}
        <div className="lg:grid lg:grid-cols-4 lg:gap-6 space-y-4 lg:space-y-0">
          <div className="lg:col-span-3 space-y-4 lg:space-y-6">
            <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] overflow-hidden">
                <AISignalCard />
              </div>
              
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h3 className="text-base lg:text-lg font-semibold">Signal History</h3>
                  {signalStats.total > 0 && (
                    <span className="text-xs text-[#64748b]">
                      <span className={signalStats.winRate >= 50 ? 'text-[#00d26a]' : 'text-[#ff3b30]'}>
                        {signalStats.winRate}%
                      </span>
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 flex-1 overflow-y-auto min-h-0 max-h-[200px] lg:max-h-[300px]">
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
                            <span className="font-medium text-sm">{signal.symbol}</span>
                            {signal.status === 'CLOSED' && (
                              <span className={clsx(
                                'text-[10px] px-1.5 py-0.5 rounded',
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
                          <span className="hidden sm:inline">{formatDate(signal.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {selectedCoinData && (
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4">{selectedCoinData.name} Details</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Current Price</p>
                    <p className="text-lg font-bold">${formatPrice(currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">24h Change</p>
                    <p className={clsx(
                      'text-lg font-bold',
                      selectedCoinData.change24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                    )}>
                      {formatPercentage(selectedCoinData.change24h)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Market Cap</p>
                    <p className="text-lg font-bold">${(selectedCoinData.marketCap / 1e9).toFixed(2)}B</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Rank</p>
                    <p className="text-lg font-bold">#{selectedCoinData.rank}</p>
                  </div>
                </div>
              </div>
            )}

            <PositionsList />
          </div>

          <div className="hidden lg:block space-y-6">
            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6">
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

        <div className="fixed bottom-20 left-4 right-4 lg:hidden z-40">
          <button
            onClick={() => setShowOrderForm(true)}
            className="w-full py-4 bg-[#3b82f6] rounded-xl font-semibold text-lg shadow-lg active:scale-95 transition-transform"
          >
            Open Order Form
          </button>
        </div>

        {showOrderForm && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowOrderForm(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-[#12121a] rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Order Form</h3>
                <button 
                  onClick={() => setShowOrderForm(false)}
                  className="p-2 hover:bg-[#1a1a24] rounded-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="bg-[#1a1a24] rounded-xl p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-[#64748b]">Available</span>
                  <span className="font-bold text-[#3b82f6]">${formatPrice(paperBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">In Positions</span>
                  <span className="font-bold">${formatPrice(totalPositionsValue)}</span>
                </div>
              </div>
              
              <OrderForm />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
