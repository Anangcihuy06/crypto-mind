'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Filter, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Layout';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';
import { formatPrice, formatDate } from '@/utils/formatters';
import { clsx } from 'clsx';
import type { Timeframe, SignalType } from '@/types';

export default function SignalsPage() {
  const dispatch = useAppDispatch();
  const { coins, selectedCoin, selectedTimeframe } = useAppSelector((state) => state.market);
  const { current, history, technicalFactors, analyzing } = useAppSelector((state) => state.signals);
  
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterType, setFilterType] = useState<SignalType | 'all'>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<Timeframe | 'all'>('all');
  
  const prevCoinRef = useRef(selectedCoin);
  const prevTimeframeRef = useRef(selectedTimeframe);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  useEffect(() => {
    if (coins.length === 0) return;
    
    const coin = coins.find(c => c.symbol === selectedCoin);
    if (!coin) return;

    const timeframe = selectedTimeframe || '1H';

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevCoinRef.current = selectedCoin;
      prevTimeframeRef.current = timeframe;
      dispatch({ type: 'signals/analyze', payload: { coin, timeframe } });
      return;
    }

    if (selectedCoin !== prevCoinRef.current || timeframe !== prevTimeframeRef.current) {
      prevCoinRef.current = selectedCoin;
      prevTimeframeRef.current = timeframe;
      dispatch({ type: 'signals/analyze', payload: { coin, timeframe } });
    }
  }, [selectedCoin, selectedTimeframe, coins, dispatch]);

  const filteredHistory = history.filter(signal => {
    if (filterSymbol !== 'all' && signal.symbol !== filterSymbol) return false;
    if (filterType !== 'all' && signal.type !== filterType) return false;
    if (filterTimeframe !== 'all' && signal.timeframe !== filterTimeframe) return false;
    return true;
  });

  const getSignalIcon = (type: SignalType) => {
    if (type === 'BUY') return <TrendingUp className="w-5 h-5" />;
    if (type === 'SELL') return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const getSignalColor = (type: SignalType) => {
    if (type === 'BUY') return 'text-[#00d26a] bg-[#00d26a]/10';
    if (type === 'SELL') return 'text-[#ff3b30] bg-[#ff3b30]/10';
    return 'text-[#fbbf24] bg-[#fbbf24]/10';
  };

  const timeframes: Timeframe[] = ['1H', '4H', '1D', '1W'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Signals</h1>
            <p className="text-[#64748b]">AI-powered trading signals and analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6">
              <h3 className="text-lg font-semibold mb-4">Current Signal</h3>
              
              <div className="flex flex-wrap gap-4 mb-4 items-center">
                <select
                  value={selectedCoin}
                  onChange={(e) => dispatch(setSelectedCoin(e.target.value))}
                  className="bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]"
                >
                  {coins.map(coin => (
                    <option key={coin.symbol} value={coin.symbol}>
                      {coin.symbol}/USDT
                    </option>
                  ))}
                </select>

                <div className="flex gap-1">
                  {timeframes.map(tf => (
                    <button
                      key={tf}
                      onClick={() => dispatch({ type: 'market/setSelectedTimeframe', payload: tf })}
                      className={clsx(
                        'px-3 py-2 rounded-lg text-sm transition-colors',
                        selectedTimeframe === tf
                          ? 'bg-[#8b5cf6] text-white'
                          : 'bg-[#1a1a24] text-[#94a3b8] hover:text-white'
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {analyzing && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6]/20 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8b5cf6]" />
                    <span className="text-sm text-[#8b5cf6]">Analyzing...</span>
                  </div>
                )}
              </div>

              {current && (
                <div className={clsx('p-4 rounded-xl', getSignalColor(current.type))}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSignalIcon(current.type)}
                      <span className="text-xl font-bold">{current.type}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#64748b]">Confidence</p>
                      <p className="text-xl font-bold text-[#8b5cf6]">{current.confidence}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-white/10 rounded-full">
                      🤖 {current.model || 'AI Model'}
                    </span>
                  </div>
                  <p className="text-sm opacity-80 mt-2">{current.reasoning}</p>
                </div>
              )}

              {current && (current.entryPrice || current.stopLoss || current.takeProfit) && (
                <div className="bg-[#1a1a24] p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-3">Price Targets</p>
                  <div className="grid grid-cols-2 gap-3">
                    {current.entryPrice && (
                      <div>
                        <p className="text-xs text-[#64748b]">Entry Price</p>
                        <p className="font-bold">${formatPrice(current.entryPrice)}</p>
                      </div>
                    )}
                    {current.stopLoss && (
                      <div>
                        <p className="text-xs text-[#64748b]">Stop Loss</p>
                        <p className="font-bold text-[#ff3b30]">${formatPrice(current.stopLoss)}</p>
                      </div>
                    )}
                    {current.takeProfit && (
                      <div>
                        <p className="text-xs text-[#64748b]">Take Profit</p>
                        <p className="font-bold text-[#00d26a]">${formatPrice(current.takeProfit)}</p>
                      </div>
                    )}
                    {current.riskRewardRatio && (
                      <div>
                        <p className="text-xs text-[#64748b]">Risk/Reward</p>
                        <p className="font-bold">1:{current.riskRewardRatio.toFixed(1)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {technicalFactors && (
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6">
                <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#1a1a24] p-4 rounded-lg">
                    <p className="text-sm text-[#64748b] mb-1">RSI (14)</p>
                    <p className={clsx(
                      'text-xl font-bold',
                      technicalFactors.rsiSignal === 'oversold' ? 'text-[#00d26a]' :
                      technicalFactors.rsiSignal === 'overbought' ? 'text-[#ff3b30]' :
                      'text-[#94a3b8]'
                    )}>
                      {technicalFactors.rsi.toFixed(1)}
                    </p>
                    <p className="text-xs text-[#64748b] capitalize">{technicalFactors.rsiSignal}</p>
                  </div>

                  <div className="bg-[#1a1a24] p-4 rounded-lg">
                    <p className="text-sm text-[#64748b] mb-1">MACD</p>
                    <p className={clsx(
                      'text-xl font-bold',
                      technicalFactors.macd.histogram > 0 ? 'text-[#00d26a]' :
                      technicalFactors.macd.histogram < 0 ? 'text-[#ff3b30]' :
                      'text-[#94a3b8]'
                    )}>
                      {technicalFactors.macd.histogram > 0 ? '▲' : technicalFactors.macd.histogram < 0 ? '▼' : '−'}
                    </p>
                    <p className="text-xs text-[#64748b]">Histogram</p>
                  </div>

                  <div className="bg-[#1a1a24] p-4 rounded-lg">
                    <p className="text-sm text-[#64748b] mb-1">Trend</p>
                    <p className={clsx(
                      'text-xl font-bold capitalize',
                      technicalFactors.trend === 'bullish' ? 'text-[#00d26a]' :
                      technicalFactors.trend === 'bearish' ? 'text-[#ff3b30]' :
                      'text-[#94a3b8]'
                    )}>
                      {technicalFactors.trend}
                    </p>
                  </div>

                  <div className="bg-[#1a1a24] p-4 rounded-lg">
                    <p className="text-sm text-[#64748b] mb-1">MA Trend</p>
                    <p className={clsx(
                      'text-xl font-bold capitalize',
                      technicalFactors.movingAverages.trend === 'bullish' ? 'text-[#00d26a]' :
                      technicalFactors.movingAverages.trend === 'bearish' ? 'text-[#ff3b30]' :
                      'text-[#94a3b8]'
                    )}>
                      {technicalFactors.movingAverages.trend}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4" />
                <h3 className="text-lg font-semibold">Filters</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#64748b] mb-1">Coin</label>
                  <select
                    value={filterSymbol}
                    onChange={(e) => setFilterSymbol(e.target.value)}
                    className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="all">All Coins</option>
                    {coins.slice(0, 20).map(coin => (
                      <option key={coin.symbol} value={coin.symbol}>{coin.symbol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#64748b] mb-1">Signal Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as SignalType | 'all')}
                    className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="all">All Types</option>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                    <option value="HOLD">HOLD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#64748b] mb-1">Timeframe</label>
                  <select
                    value={filterTimeframe}
                    onChange={(e) => setFilterTimeframe(e.target.value as Timeframe | 'all')}
                    className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="all">All Timeframes</option>
                    {timeframes.map(tf => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6">
              <h3 className="text-lg font-semibold mb-4">Signal History</h3>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredHistory.length === 0 ? (
                  <p className="text-[#64748b] text-center py-4">No signals yet</p>
                ) : (
                  filteredHistory.slice(0, 20).map((signal) => (
                    <div
                      key={signal.id}
                      className="bg-[#1a1a24] p-3 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{signal.symbol}</span>
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
                      </div>
                      <p className="text-xs text-[#64748b] mt-1">
                        {formatDate(signal.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
