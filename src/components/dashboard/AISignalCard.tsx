'use client';

import { Brain, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setCurrentSignal, setTechnicalFactors, setAnalyzing } from '@/store/slices/signalSlice';
import { formatPrice, formatDate } from '@/utils/formatters';
import { clsx } from 'clsx';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Timeframe, CandleData } from '@/types';

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
  
  console.log(`[AISignalCard] Fetching candles: ${binanceSymbol} ${interval}`);
  
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

export function AISignalCard() {
  const dispatch = useAppDispatch();
  const { current, technicalFactors, analyzing, error } = useAppSelector((state) => state.signals);
  const { selectedCoin, coins, selectedTimeframe } = useAppSelector((state) => state.market);

  const [isLoading, setIsLoading] = useState(false);
  
  const coin = coins.find((c) => c.symbol === selectedCoin);
  
  const prevCoinRef = useRef(selectedCoin);
  const prevTimeframeRef = useRef(selectedTimeframe);
  const isFirstLoad = useRef(true);

  const performAnalysis = useCallback(async (coinSymbol: string, timeframe: Timeframe) => {
    if (!coinSymbol || isLoading) {
      console.log('[AISignalCard] Skipping analysis:', !coinSymbol ? 'no symbol' : 'already fetching');
      return;
    }
    
    const currentCoin = coins.find(c => c.symbol === coinSymbol);
    if (!currentCoin) {
      console.error('[AISignalCard] Coin not found:', coinSymbol);
      return;
    }

    setIsLoading(true);
    dispatch(setAnalyzing(true));
    
    try {
      console.log(`[AISignalCard] Fetching candles for ${coinSymbol} ${timeframe}`);
      
      const [candles, higherCandles] = await Promise.all([
        fetchCandlesFromBinance(coinSymbol, timeframe, 200),
        timeframe === '1H' || timeframe === '4H'
          ? fetchCandlesFromBinance(coinSymbol, timeframe === '1H' ? '4H' : '1D', 50)
          : Promise.resolve([] as CandleData[])
      ]);
      
      console.log(`[AISignalCard] Got ${candles.length} candles, higher TF: ${higherCandles.length}`);
      
      if (candles.length === 0) {
        throw new Error('No candle data returned from Binance');
      }
      
      dispatch({
        type: 'signals/analyze',
        payload: {
          coin: currentCoin,
          timeframe,
          candles,
          higherTimeframeCandles: higherCandles.length > 0 ? higherCandles : undefined,
        }
      });
    } catch (err) {
      console.error('[AISignalCard] Error fetching candles:', err);
      dispatch(setAnalyzing(false));
    } finally {
      setIsLoading(false);
    }
  }, [coins, dispatch, isLoading]);

  useEffect(() => {
    if (!coin) return;

    const timeframe = selectedTimeframe || '1H';
    const hasChanged = selectedCoin !== prevCoinRef.current || timeframe !== prevTimeframeRef.current;

    if (isFirstLoad.current || hasChanged) {
      isFirstLoad.current = false;
      prevCoinRef.current = selectedCoin;
      prevTimeframeRef.current = timeframe;
      console.log('[AISignalCard] Triggering analysis for:', selectedCoin, timeframe);
      performAnalysis(selectedCoin, timeframe);
    }
  }, [selectedCoin, selectedTimeframe, coin, performAnalysis]);

  const getSignalIcon = () => {
    if (!current) return <Minus className="w-6 h-6 lg:w-8 lg:h-8" />;
    if (current.type === 'BUY') return <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8" />;
    if (current.type === 'SELL') return <TrendingDown className="w-6 h-6 lg:w-8 lg:h-8" />;
    return <Minus className="w-6 h-6 lg:w-8 lg:h-8" />;
  };

  const getSignalColor = () => {
    if (!current) return 'text-[#64748b]';
    if (current.type === 'BUY') return 'text-[#00d26a]';
    if (current.type === 'SELL') return 'text-[#ff3b30]';
    return 'text-[#fbbf24]';
  };

  const getSignalBgColor = () => {
    if (!current) return 'bg-[#1a1a24]';
    if (current.type === 'BUY') return 'bg-[#00d26a]/10';
    if (current.type === 'SELL') return 'bg-[#ff3b30]/10';
    return 'bg-[#fbbf24]/10';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 lg:p-4 border-b border-[#2d2d3a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-base lg:text-lg font-semibold">AI Analysis</h3>
        </div>
        
        {(analyzing || isLoading) && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[#8b5cf6] animate-spin" />
            <span className="text-xs lg:text-sm text-[#64748b] hidden sm:inline">
              {isLoading ? 'Fetching...' : 'Analyzing...'}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 lg:p-4 flex-1 overflow-y-auto">
        {error ? (
          <div className="text-center py-6 lg:py-8">
            <p className="text-[#ff3b30] text-sm">{error}</p>
          </div>
        ) : !current && !analyzing && !isLoading ? (
          <div className="text-center py-6 lg:py-8">
            <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 lg:mb-4 rounded-full bg-[#1a1a24] flex items-center justify-center">
              <Brain className="w-6 h-6 lg:w-8 lg:h-8 text-[#64748b]" />
            </div>
            <p className="text-[#64748b] text-sm">Loading AI analysis...</p>
          </div>
        ) : !current ? (
          <div className="text-center py-6 lg:py-8">
            <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 lg:mb-4 rounded-full bg-[#1a1a24] flex items-center justify-center">
              <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 text-[#8b5cf6] animate-spin" />
            </div>
            <p className="text-[#64748b] text-sm">Fetching data...</p>
          </div>
        ) : (
          <div className="space-y-3 lg:space-y-4">
            <div className={clsx('p-3 lg:p-4 rounded-xl', getSignalBgColor())}>
              <div className="flex items-center justify-between mb-2">
                <div className={clsx('flex items-center gap-2', getSignalColor())}>
                  {getSignalIcon()}
                  <span className="text-xl lg:text-2xl font-bold">{current.type}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#64748b]">Confidence</p>
                  <p className="text-lg lg:text-xl font-bold text-[#8b5cf6]">{current.confidence}%</p>
                </div>
              </div>
              <p className="text-sm text-[#94a3b8] line-clamp-2 lg:line-clamp-none">{current.reasoning}</p>
              
              <div className={clsx(
                'flex items-center gap-2 mt-2 px-2 py-1 rounded text-xs',
                current.sources?.includes('AI Analysis (OpenRouter)') 
                  ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' 
                  : 'bg-[#fbbf24]/20 text-[#fbbf24]'
              )}>
                <Brain className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {current.sources?.includes('AI Analysis (OpenRouter)') 
                    ? `AI: ${current.model || 'Claude'}`
                    : 'Technical Analysis (Fallback)'}
                </span>
                <span className="sm:hidden">AI</span>
              </div>
            </div>

            {(current.entryPrice || current.stopLoss || current.takeProfit) && (
              <div className="bg-[#1a1a24] p-3 lg:p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2 lg:mb-3">Price Targets</p>
                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  {current.entryPrice && (
                    <div>
                      <p className="text-xs text-[#64748b]">Entry</p>
                      <p className="font-bold text-sm lg:text-base">${formatPrice(current.entryPrice)}</p>
                    </div>
                  )}
                  {current.stopLoss && (
                    <div>
                      <p className="text-xs text-[#64748b]">Stop Loss</p>
                      <p className="font-bold text-[#ff3b30] text-sm lg:text-base">${formatPrice(current.stopLoss)}</p>
                    </div>
                  )}
                  {current.takeProfit && (
                    <div>
                      <p className="text-xs text-[#64748b]">Take Profit</p>
                      <p className="font-bold text-[#00d26a] text-sm lg:text-base">${formatPrice(current.takeProfit)}</p>
                    </div>
                  )}
                  {current.riskRewardRatio && (
                    <div>
                      <p className="text-xs text-[#64748b]">Risk/Reward</p>
                      <p className="font-bold text-sm lg:text-base">1:{current.riskRewardRatio.toFixed(1)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {technicalFactors && (
              <div className="grid grid-cols-3 gap-2 lg:gap-3">
                <div className="bg-[#1a1a24] p-2 lg:p-3 rounded-lg">
                  <p className="text-xs text-[#64748b] mb-1">RSI</p>
                  <p className={clsx(
                    'font-bold text-sm lg:text-base',
                    technicalFactors.rsiSignal === 'oversold' ? 'text-[#00d26a]' :
                    technicalFactors.rsiSignal === 'overbought' ? 'text-[#ff3b30]' :
                    'text-[#94a3b8]'
                  )}>
                    {technicalFactors.rsi.toFixed(1)}
                  </p>
                </div>
                <div className="bg-[#1a1a24] p-2 lg:p-3 rounded-lg">
                  <p className="text-xs text-[#64748b] mb-1">MACD</p>
                  <p className={clsx(
                    'font-bold text-sm lg:text-base',
                    technicalFactors.macd.histogram > 0 ? 'text-[#00d26a]' :
                    technicalFactors.macd.histogram < 0 ? 'text-[#ff3b30]' :
                    'text-[#94a3b8]'
                  )}>
                    {technicalFactors.macd.histogram > 0 ? '▲' : technicalFactors.macd.histogram < 0 ? '▼' : '−'}
                  </p>
                </div>
                <div className="bg-[#1a1a24] p-2 lg:p-3 rounded-lg">
                  <p className="text-xs text-[#64748b] mb-1">Trend</p>
                  <p className={clsx(
                    'font-bold text-xs lg:text-sm uppercase',
                    technicalFactors.trend === 'bullish' ? 'text-[#00d26a]' :
                    technicalFactors.trend === 'bearish' ? 'text-[#ff3b30]' :
                    'text-[#94a3b8]'
                  )}>
                    {technicalFactors.trend}
                  </p>
                </div>
              </div>
            )}

            {current.aiAnalysis && (
              <div className="bg-[#1a1a24] p-2 lg:p-3 rounded-lg hidden sm:block">
                <p className="text-xs text-[#64748b] mb-1 lg:mb-2">AI Insights</p>
                <p className="text-xs lg:text-sm text-[#94a3b8] line-clamp-3">{current.aiAnalysis}</p>
              </div>
            )}

            <div className="text-xs text-[#64748b] hidden lg:block">
              <p>Timeframe: {selectedTimeframe}</p>
              {current.createdAt && <p>Updated: {formatDate(current.createdAt)}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
