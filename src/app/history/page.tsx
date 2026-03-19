'use client';

import { useEffect, useState } from 'react';
import { History as HistoryIcon, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Wallet, BarChart3 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Layout';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { formatPrice, formatPercentage, formatDate, formatQuantity } from '@/utils/formatters';
import { clsx } from 'clsx';


export default function HistoryPage() {
  const dispatch = useAppDispatch();
  const { coins } = useAppSelector((state) => state.market);
  const { trades, positions, paperBalance, totalPnL, totalPnLPercentage } = useAppSelector((state) => state.portfolio);
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
    totalPnL: trades.reduce((acc, t) => acc + (t.pnl || 0), 0),
  };

  const winRate = stats.totalTrades > 0 
    ? ((stats.winningTrades / stats.totalTrades) * 100).toFixed(1) 
    : '0.0';

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">History</h1>
          <p className="text-sm text-[#64748b] hidden sm:block">Trade history and performance analytics</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-1 lg:mb-2">
              <Wallet className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-xs text-[#64748b] hidden sm:block">Balance</span>
            </div>
            <p className="text-lg lg:text-2xl font-bold">${formatPrice(paperBalance)}</p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-1 lg:mb-2">
              {totalPnL >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[#00d26a]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#ff3b30]" />
              )}
              <span className="text-xs text-[#64748b] hidden sm:block">Total P&L</span>
            </div>
            <p className={clsx('text-lg lg:text-2xl font-bold', totalPnL >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]')}>
              {totalPnL >= 0 ? '+' : ''}${formatPrice(totalPnL)}
            </p>
            <p className={clsx('text-xs', totalPnLPercentage >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]')}>
              {formatPercentage(totalPnLPercentage)}
            </p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-1 lg:mb-2">
              <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-xs text-[#64748b] hidden sm:block">Win Rate</span>
            </div>
            <p className="text-lg lg:text-2xl font-bold">{winRate}%</p>
            <p className="text-xs text-[#64748b]">
              {stats.winningTrades}/{stats.totalTrades}
            </p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-1 lg:mb-2">
              <HistoryIcon className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-xs text-[#64748b] hidden sm:block">Trades</span>
            </div>
            <p className="text-lg lg:text-2xl font-bold">{stats.totalTrades}</p>
            <p className="text-xs text-[#64748b]">
              {stats.buyTrades}B / {stats.sellTrades}S
            </p>
          </div>
        </div>

        <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a]">
          <div className="border-b border-[#2d2d3a] p-3 lg:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
                <button
                  onClick={() => setActiveTab('trades')}
                  className={clsx(
                    'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap active:scale-95',
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
                    'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap active:scale-95',
                    activeTab === 'positions'
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  )}
                >
                  Positions
                </button>
                <button
                  onClick={() => setActiveTab('signals')}
                  className={clsx(
                    'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap active:scale-95',
                    activeTab === 'signals'
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  )}
                >
                  Signals
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  className="bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-2 lg:px-3 py-1.5 text-xs lg:text-sm text-white focus:outline-none"
                >
                  <option value="all">All</option>
                  {coins.slice(0, 10).map(coin => (
                    <option key={coin.symbol} value={coin.symbol}>{coin.symbol}</option>
                  ))}
                </select>

                {activeTab === 'trades' && (
                  <select
                    value={filterSide}
                    onChange={(e) => setFilterSide(e.target.value)}
                    className="bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-2 lg:px-3 py-1.5 text-xs lg:text-sm text-white focus:outline-none hidden sm:block"
                  >
                    <option value="all">All Sides</option>
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 lg:p-4">
            {activeTab === 'trades' && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2d2d3a]">
                      <th className="text-left p-2 lg:p-3 text-xs font-medium text-[#64748b]">Time</th>
                      <th className="text-left p-2 lg:p-3 text-xs font-medium text-[#64748b]">Symbol</th>
                      <th className="text-left p-2 lg:p-3 text-xs font-medium text-[#64748b]">Side</th>
                      <th className="text-right p-2 lg:p-3 text-xs font-medium text-[#64748b]">Price</th>
                      <th className="text-right p-2 lg:p-3 text-xs font-medium text-[#64748b] hidden lg:table-cell">Qty</th>
                      <th className="text-right p-2 lg:p-3 text-xs font-medium text-[#64748b] hidden lg:table-cell">Value</th>
                      <th className="text-right p-2 lg:p-3 text-xs font-medium text-[#64748b]">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-6 lg:p-8 text-[#64748b]">
                          No trades yet
                        </td>
                      </tr>
                    ) : (
                      filteredTrades.map((trade) => (
                        <tr key={trade.id} className="border-b border-[#2d2d3a] hover:bg-[#1a1a24]">
                          <td className="p-2 lg:p-3 text-xs">{formatDate(trade.timestamp)}</td>
                          <td className="p-2 lg:p-3 font-medium text-sm">{trade.symbol}</td>
                          <td className="p-2 lg:p-3">
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
                          <td className="p-2 lg:p-3 text-right text-sm">${formatPrice(trade.price)}</td>
                          <td className="p-2 lg:p-3 text-right text-sm hidden lg:table-cell">{formatQuantity(trade.quantity)}</td>
                          <td className="p-2 lg:p-3 text-right text-sm hidden lg:table-cell">${formatPrice(trade.value)}</td>
                          <td className="p-2 lg:p-3 text-right">
                            {trade.pnl !== undefined && (
                              <span className={clsx(
                                'font-medium text-sm',
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

            {activeTab === 'trades' && (
              <div className="md:hidden space-y-2">
                {filteredTrades.length === 0 ? (
                  <p className="text-center p-6 text-[#64748b]">No trades yet</p>
                ) : (
                  filteredTrades.map((trade) => (
                    <div key={trade.id} className="bg-[#1a1a24] p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{trade.symbol}</span>
                          <span className={clsx(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                            trade.side === 'BUY' 
                              ? 'bg-[#00d26a]/20 text-[#00d26a]' 
                              : 'bg-[#ff3b30]/20 text-[#ff3b30]'
                          )}>
                            {trade.side}
                          </span>
                        </div>
                      <span className={clsx(
                          'font-medium',
                          (trade.pnl ?? 0) >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                        )}>
                          {(trade.pnl ?? 0) >= 0 ? '+' : ''}${formatPrice(trade.pnl ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#64748b]">
                        <span>${formatPrice(trade.price)} × {formatQuantity(trade.quantity)}</span>
                        <span>{formatDate(trade.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="space-y-3">
                {filteredPositions.length === 0 ? (
                  <p className="text-center p-6 lg:p-8 text-[#64748b]">No open positions</p>
                ) : (
                  filteredPositions.map((position) => (
                    <div key={position.id} className="bg-[#1a1a24] p-3 lg:p-4 rounded-lg">
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
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 text-sm">
                        <div>
                          <p className="text-[#64748b] text-xs">Entry</p>
                          <p>${formatPrice(position.entryPrice)}</p>
                        </div>
                        <div>
                          <p className="text-[#64748b] text-xs">Current</p>
                          <p>${formatPrice(position.currentPrice)}</p>
                        </div>
                        <div>
                          <p className="text-[#64748b] text-xs">Qty</p>
                          <p>{formatQuantity(position.quantity)}</p>
                        </div>
                        <div>
                          <p className="text-[#64748b] text-xs">Value</p>
                          <p>${formatPrice(position.value)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'signals' && (
              <div className="space-y-3 max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                {filteredSignals.length === 0 ? (
                  <p className="text-center p-6 lg:p-8 text-[#64748b]">No signals generated</p>
                ) : (
                  filteredSignals.map((signal) => (
                    <div key={signal.id} className="bg-[#1a1a24] p-3 lg:p-4 rounded-lg">
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
                      <p className="text-sm text-[#94a3b8] mb-2 line-clamp-2">{signal.reasoning}</p>
                      
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
