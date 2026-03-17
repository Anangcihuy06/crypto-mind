'use client';

import { useEffect, useState } from 'react';
import { History as HistoryIcon, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Wallet, BarChart3, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Layout';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';
import { formatPrice, formatPercentage, formatDate, formatQuantity } from '@/utils/formatters';
import { clsx } from 'clsx';
import type { SignalType } from '@/types';

export default function HistoryPage() {
  const dispatch = useAppDispatch();
  const { coins } = useAppSelector((state) => state.market);
  const { trades, positions, paperBalance, initialBalance, totalPnL, totalPnLPercentage } = useAppSelector((state) => state.portfolio);
  const { history } = useAppSelector((state) => state.signals);
  
  const [activeTab, setActiveTab] = useState<'trades' | 'positions' | 'signals'>('trades');
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');

  useEffect(() => {
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  const filteredTrades = trades.filter(trade => {
    if (filterSymbol !== 'all' && trade.symbol !== filterSymbol) return false;
    if (filterSide !== 'all' && trade.side !== filterSide) return false;
    return true;
  });

  const filteredPositions = positions.filter(pos => {
    if (filterSymbol !== 'all' && pos.symbol !== filterSymbol) return false;
    return true;
  });

  const filteredSignals = history.filter(signal => {
    if (filterSymbol !== 'all' && signal.symbol !== filterSymbol) return false;
    return true;
  });

  const stats = {
    totalTrades: trades.length,
    buyTrades: trades.filter(t => t.side === 'BUY').length,
    sellTrades: trades.filter(t => t.side === 'SELL').length,
    winningTrades: trades.filter(t => (t.pnl || 0) > 0).length,
    losingTrades: trades.filter(t => (t.pnl || 0) < 0).length,
    totalFees: trades.reduce((acc, t) => acc + t.fee, 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-[#64748b]">Trade history and performance analytics</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-sm text-[#64748b]">Current Balance</span>
            </div>
            <p className="text-2xl font-bold">${formatPrice(paperBalance)}</p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={clsx('w-4 h-4', totalPnL >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]')} />
              <span className="text-sm text-[#64748b]">Total P&L</span>
            </div>
            <p className={clsx('text-2xl font-bold', totalPnL >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]')}>
              {totalPnL >= 0 ? '+' : ''}${formatPrice(totalPnL)}
            </p>
            <p className={clsx('text-sm', totalPnLPercentage >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]')}>
              {formatPercentage(totalPnLPercentage)}
            </p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-sm text-[#64748b]">Win Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.totalTrades > 0 
                ? ((stats.winningTrades / stats.totalTrades) * 100).toFixed(1) 
                : 0}%
            </p>
            <p className="text-sm text-[#64748b]">
              {stats.winningTrades}/{stats.totalTrades} trades
            </p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4">
            <div className="flex items-center gap-2 mb-2">
              <HistoryIcon className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-sm text-[#64748b]">Total Trades</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalTrades}</p>
            <p className="text-sm text-[#64748b]">
              {stats.buyTrades} buys, {stats.sellTrades} sells
            </p>
          </div>
        </div>

        <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a]">
          <div className="border-b border-[#2d2d3a] p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('trades')}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'trades'
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  )}
                >
                  Trades
                </button>
                <button
                  onClick={() => setActiveTab('positions')}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'positions'
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  )}
                >
                  Open Positions
                </button>
                <button
                  onClick={() => setActiveTab('signals')}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'signals'
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  )}
                >
                  Signals
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#64748b]" />
                <select
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  className="bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                >
                  <option value="all">All Coins</option>
                  {coins.slice(0, 20).map(coin => (
                    <option key={coin.symbol} value={coin.symbol}>{coin.symbol}</option>
                  ))}
                </select>

                {activeTab === 'trades' && (
                  <select
                    value={filterSide}
                    onChange={(e) => setFilterSide(e.target.value)}
                    className="bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                  >
                    <option value="all">All Sides</option>
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'trades' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2d2d3a]">
                      <th className="text-left p-3 text-sm font-medium text-[#64748b]">Time</th>
                      <th className="text-left p-3 text-sm font-medium text-[#64748b]">Symbol</th>
                      <th className="text-left p-3 text-sm font-medium text-[#64748b]">Side</th>
                      <th className="text-right p-3 text-sm font-medium text-[#64748b]">Price</th>
                      <th className="text-right p-3 text-sm font-medium text-[#64748b]">Quantity</th>
                      <th className="text-right p-3 text-sm font-medium text-[#64748b]">Value</th>
                      <th className="text-right p-3 text-sm font-medium text-[#64748b]">Fee</th>
                      <th className="text-right p-3 text-sm font-medium text-[#64748b]">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-[#64748b]">
                          No trades yet
                        </td>
                      </tr>
                    ) : (
                      filteredTrades.map((trade) => (
                        <tr key={trade.id} className="border-b border-[#2d2d3a] hover:bg-[#1a1a24]">
                          <td className="p-3 text-sm">{formatDate(trade.timestamp)}</td>
                          <td className="p-3 font-medium">{trade.symbol}</td>
                          <td className="p-3">
                            <span className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                              trade.side === 'BUY' 
                                ? 'bg-[#00d26a]/20 text-[#00d26a]' 
                                : 'bg-[#ff3b30]/20 text-[#ff3b30]'
                            )}>
                              {trade.side === 'BUY' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {trade.side}
                            </span>
                          </td>
                          <td className="p-3 text-right">${formatPrice(trade.price)}</td>
                          <td className="p-3 text-right">{formatQuantity(trade.quantity)}</td>
                          <td className="p-3 text-right">${formatPrice(trade.value)}</td>
                          <td className="p-3 text-right text-[#64748b]">${formatPrice(trade.fee)}</td>
                          <td className="p-3 text-right">
                            {trade.pnl !== undefined && (
                              <span className={clsx(
                                'font-medium',
                                trade.pnl >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                              )}>
                                {trade.pnl >= 0 ? '+' : ''}${formatPrice(trade.pnl)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="space-y-3">
                {filteredPositions.length === 0 ? (
                  <p className="text-center p-8 text-[#64748b]">No open positions</p>
                ) : (
                  filteredPositions.map((position) => (
                    <div key={position.id} className="bg-[#1a1a24] p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{position.symbol}</span>
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs',
                            position.side === 'LONG' 
                              ? 'bg-[#00d26a]/20 text-[#00d26a]' 
                              : 'bg-[#ff3b30]/20 text-[#ff3b30]'
                          )}>
                            {position.side}
                          </span>
                        </div>
                        <span className={clsx(
                          'font-bold',
                          position.pnl >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                        )}>
                          {position.pnl >= 0 ? '+' : ''}${formatPrice(position.pnl)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[#64748b]">Entry</p>
                          <p>${formatPrice(position.entryPrice)}</p>
                        </div>
                        <div>
                          <p className="text-[#64748b]">Current</p>
                          <p>${formatPrice(position.currentPrice)}</p>
                        </div>
                        <div>
                          <p className="text-[#64748b]">Quantity</p>
                          <p>{formatQuantity(position.quantity)}</p>
                        </div>
                        <div>
                          <p className="text-[#64748b]">Value</p>
                          <p>${formatPrice(position.value)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'signals' && (
              <div className="space-y-3">
                {filteredSignals.length === 0 ? (
                  <p className="text-center p-8 text-[#64748b]">No signals generated</p>
                ) : (
                  filteredSignals.map((signal) => (
                    <div key={signal.id} className="bg-[#1a1a24] p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{signal.symbol}</span>
                          <span className="text-xs text-[#64748b]">{signal.timeframe}</span>
                        </div>
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          signal.type === 'BUY' ? 'bg-[#00d26a]/20 text-[#00d26a]' :
                          signal.type === 'SELL' ? 'bg-[#ff3b30]/20 text-[#ff3b30]' :
                          'bg-[#fbbf24]/20 text-[#fbbf24]'
                        )}>
                          {signal.type}
                        </span>
                      </div>
                      <p className="text-sm text-[#94a3b8] mb-2">{signal.reasoning}</p>
                      
                      {(signal.entryPrice || signal.stopLoss || signal.takeProfit) && (
                        <div className="flex flex-wrap gap-3 mb-2 text-xs">
                          {signal.entryPrice && (
                            <span className="text-[#64748b]">Entry: <span className="text-white">${formatPrice(signal.entryPrice)}</span></span>
                          )}
                          {signal.stopLoss && (
                            <span className="text-[#64748b]">SL: <span className="text-[#ff3b30]">${formatPrice(signal.stopLoss)}</span></span>
                          )}
                          {signal.takeProfit && (
                            <span className="text-[#64748b]">TP: <span className="text-[#00d26a]">${formatPrice(signal.takeProfit)}</span></span>
                          )}
                          {signal.riskRewardRatio && (
                            <span className="text-[#64748b]">R:R: <span className="text-white">1:{signal.riskRewardRatio.toFixed(1)}</span></span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-[#64748b]">
                        <span>Confidence: {signal.confidence}%</span>
                        <span>{formatDate(signal.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
