'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Filter, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Layout';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';
import { initializeHistory } from '@/store/slices/signalSlice';
import { formatPrice, formatDate } from '@/utils/formatters';
import { clsx } from 'clsx';
import type { Timeframe, SignalType, CandleData } from '@/types';

const BINANCE_API = 'https://api.binance.com/api/v3';

const TIMEFRAME_MAP: Record<Timeframe, string> = {
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
  '1W': '1w',
};

async function fetchCandlesFromBinance(symbol: string, timeframe: Timeframe, limit = 200): Promise<CandleData[]> {
  const binanceSymbol = `${symbol.toUpperCase()}USDT`;
  const interval = TIMEFRAME_MAP[timeframe] || '1h';
  
  console.log(`[Signals] Fetching candles: ${binanceSymbol} ${interval}`);
  
  const response = await fetch(
    `${BINANCE_API}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
    { cache: 'no-store' }
  );
  
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.map((item: [number, string, string, string, string, string, number]) => ({
    time: Math.floor(item[0] / 1000),
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
  }));
}

export default function SignalsPage() {
  const dispatch = useAppDispatch();
  const { coins, selectedCoin, selectedTimeframe } = useAppSelector((state) => state.market);
  const { current, history, technicalFactors, analyzing } = useAppSelector((state) => state.signals);
  
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterType, setFilterType] = useState<SignalType | 'all'>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<Timeframe | 'all'>('all');
  const [fetchingCandles, setFetchingCandles] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const prevCoinRef = useRef(selectedCoin);
  const prevTimeframeRef = useRef(selectedTimeframe);
  const isFirstLoad = useRef(true);

  const performAnalysis = useCallback(async (coinSymbol: string, timeframe: Timeframe) => {
    if (!coinSymbol || fetchingCandles) {
      console.log('[Signals] Skipping analysis:', !coinSymbol ? 'no symbol' : 'already fetching');
      return;
    }
    
    const coin = coins.find(c => c.symbol === coinSymbol);
    if (!coin) {
      console.error('[Signals] Coin not found:', coinSymbol);
      return;
    }

    setFetchingCandles(true);
    
    try {
      console.log(`[Signals] Fetching candles for ${coinSymbol} ${timeframe}`);
      
      const [candles, higherCandles] = await Promise.all([
        fetchCandlesFromBinance(coinSymbol, timeframe, 200),
        timeframe === '1H' || timeframe === '4H'
          ? fetchCandlesFromBinance(coinSymbol, timeframe === '1H' ? '4H' : '1D', 50)
          : Promise.resolve([] as CandleData[])
      ]);
      
      console.log(`[Signals] Got ${candles.length} candles, higher TF: ${higherCandles.length}`);
      
      if (candles.length === 0) {
        throw new Error('No candle data returned from Binance');
      }
      
      dispatch({
        type: 'signals/analyze',
        payload: {
          coin,
          timeframe,
          candles,
          higherTimeframeCandles: higherCandles.length > 0 ? higherCandles : undefined,
        }
      });
    } catch (error) {
      console.error('[Signals] Error fetching candles:', error);
      dispatch({
        type: 'signals/analyze',
        payload: {
          coin,
          timeframe,
          candles: null,
          higherTimeframeCandles: undefined,
        }
      });
    } finally {
      setFetchingCandles(false);
    }
  }, [coins, dispatch, fetchingCandles]);

  useEffect(() => {
    dispatch(initializeHistory());
    if (coins.length === 0) {
      dispatch({ type: 'market/fetchMarketData' });
    }
  }, [dispatch, coins.length]);

  useEffect(() => {
    if (coins.length === 0) return;
    
    const timeframe = selectedTimeframe || '1H';
    const coin = coins.find(c => c.symbol === selectedCoin);
    
    if (!coin) {
      console.warn('[Signals] Coin not found in list:', selectedCoin);
      return;
    }

    const hasChanged = selectedCoin !== prevCoinRef.current || timeframe !== prevTimeframeRef.current;
    
    if (isFirstLoad.current || hasChanged) {
      isFirstLoad.current = false;
      prevCoinRef.current = selectedCoin;
      prevTimeframeRef.current = timeframe;
      console.log('[Signals] Triggering analysis for:', selectedCoin, timeframe);
      performAnalysis(selectedCoin, timeframe);
    }
  }, [selectedCoin, selectedTimeframe, coins, performAnalysis]);

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
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">AI Signals</h1>
            <p className="text-sm text-[#64748b] hidden sm:block">AI-powered trading signals and analysis</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden p-2 bg-[#1a1a24] rounded-lg"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4">Current Signal</h3>
              
              <div className="flex flex-wrap gap-2 lg:gap-4 mb-4 items-center">
                <select
                  value={selectedCoin}
                  onChange={(e) => dispatch(setSelectedCoin(e.target.value))}
                  className="bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 lg:px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6] text-sm flex-1 lg:flex-initial"
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
                        'px-3 py-2 rounded-lg text-sm transition-colors active:scale-95',
                        selectedTimeframe === tf
                          ? 'bg-[#8b5cf6] text-white'
                          : 'bg-[#1a1a24] text-[#94a3b8] hover:text-white'
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {(analyzing || fetchingCandles) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#8b5cf6]/20 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8b5cf6]" />
                    <span className="text-xs lg:text-sm text-[#8b5cf6]">
                      {fetchingCandles ? 'Fetching...' : 'Analyzing...'}
                    </span>
                  </div>
                )}
              </div>

              {current && (
                <div className={clsx('p-4 rounded-xl', getSignalColor(current.type))}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSignalIcon(current.type)}
                      <span className="text-lg lg:text-xl font-bold">{current.type}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#64748b]">Confidence</p>
                      <p className="text-lg lg:text-xl font-bold text-[#8b5cf6]">{current.confidence}%</p>
                    </div>
                  </div>
                  <p className="text-sm opacity-80 mt-2">{current.reasoning}</p>
                </div>
              )}

              {current && (current.entryPrice || current.stopLoss || current.takeProfit) && (
                <div className="bg-[#1a1a24] p-4 rounded-lg mt-4">
                  <p className="text-sm font-semibold mb-3">Price Targets</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4">Technical Indicators</h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                  <div className="bg-[#1a1a24] p-3 lg:p-4 rounded-lg">
                    <p className="text-xs lg:text-sm text-[#64748b] mb-1">RSI (14)</p>
                    <p className={clsx(
                      'text-lg lg:text-xl font-bold',
                      technicalFactors.rsiSignal === 'oversold' ? 'text-[#00d26a]' :
                      technicalFactors.rsiSignal === 'overbought' ? 'text-[#ff3b30]' :
                      'text-[#94a3b8]'
                    )}>
                      {technicalFactors.rsi.toFixed(1)}
                    </p>
                    <p className="text-xs text-[#64748b] capitalize">{technicalFactors.rsiSignal}</p>
                  </div>

                  <div className="bg-[#1a1a24] p-3 lg:p-4 rounded-lg">
                    <p className="text-xs lg:text-sm text-[#64748b] mb-1">MACD</p>
                    <p className={clsx(
                      'text-lg lg:text-xl font-bold',
                      technicalFactors.macd.histogram > 0 ? 'text-[#00d26a]' :
                      technicalFactors.macd.histogram < 0 ? 'text-[#ff3b30]' :
                      'text-[#94a3b8]'
                    )}>
                      {technicalFactors.macd.histogram > 0 ? '▲' : technicalFactors.macd.histogram < 0 ? '▼' : '−'}
                    </p>
                    <p className="text-xs text-[#64748b]">Histogram</p>
                  </div>

                  <div className="bg-[#1a1a24] p-3 lg:p-4 rounded-lg">
                    <p className="text-xs lg:text-sm text-[#64748b] mb-1">Trend</p>
                    <p className={clsx(
                      'text-lg lg:text-xl font-bold capitalize',
                      technicalFactors.trend === 'bullish' ? 'text-[#00d26a]' :
                      technicalFactors.trend === 'bearish' ? 'text-[#ff3b30]' :
                      'text-[#94a3b8]'
                    )}>
                      {technicalFactors.trend}
                    </p>
                  </div>

                  <div className="bg-[#1a1a24] p-3 lg:p-4 rounded-lg">
                    <p className="text-xs lg:text-sm text-[#64748b] mb-1">MA Trend</p>
                    <p className={clsx(
                      'text-lg lg:text-xl font-bold capitalize',
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

          <div className="space-y-4 lg:space-y-6">
            <div className={clsx(
              'bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4 lg:p-6',
              !showFilters && 'lg:block hidden'
            )}>
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4" />
                <h3 className="text-base lg:text-lg font-semibold">Filters</h3>
              </div>

              <div className="space-y-3 lg:space-y-4">
                <div>
                  <label className="block text-xs lg:text-sm text-[#64748b] mb-1">Coin</label>
                  <select
                    value={filterSymbol}
                    onChange={(e) => setFilterSymbol(e.target.value)}
                    className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6] text-sm"
                  >
                    <option value="all">All Coins</option>
                    {coins.slice(0, 20).map(coin => (
                      <option key={coin.symbol} value={coin.symbol}>{coin.symbol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm text-[#64748b] mb-1">Signal Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as SignalType | 'all')}
                    className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6] text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                    <option value="HOLD">HOLD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm text-[#64748b] mb-1">Timeframe</label>
                  <select
                    value={filterTimeframe}
                    onChange={(e) => setFilterTimeframe(e.target.value as Timeframe | 'all')}
                    className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6] text-sm"
                  >
                    <option value="all">All Timeframes</option>
                    {timeframes.map(tf => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4">Signal History</h3>
              
              <div className="space-y-3 max-h-[300px] lg:max-h-[400px] overflow-y-auto">
                {filteredHistory.length === 0 ? (
                  <p className="text-[#64748b] text-center py-4">No signals yet</p>
                ) : (
                  filteredHistory.slice(0, 15).map((signal) => (
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
