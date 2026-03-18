'use client';

import { Brain, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setCurrentSignal, setTechnicalFactors, setAnalyzing } from '@/store/slices/signalSlice';
import { formatPrice, formatPercentage, formatDate } from '@/utils/formatters';
import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';

export function AISignalCard() {
  const dispatch = useAppDispatch();
  const { current, technicalFactors, analyzing, error } = useAppSelector((state) => state.signals);
  const { selectedCoin, coins, selectedTimeframe } = useAppSelector((state) => state.market);

  const coin = coins.find((c) => c.symbol === selectedCoin);
  
  const prevCoinRef = useRef(selectedCoin);
  const prevTimeframeRef = useRef(selectedTimeframe);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!coin) return;

    const timeframe = selectedTimeframe || '1H';

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevCoinRef.current = selectedCoin;
      prevTimeframeRef.current = timeframe;
      dispatch(setAnalyzing(true));
      dispatch({ 
        type: 'signals/analyze', 
        payload: { coin, timeframe } 
      });
      return;
    }

    if (selectedCoin !== prevCoinRef.current || timeframe !== prevTimeframeRef.current) {
      prevCoinRef.current = selectedCoin;
      prevTimeframeRef.current = timeframe;
      dispatch(setAnalyzing(true));
      dispatch({ 
        type: 'signals/analyze', 
        payload: { coin, timeframe } 
      });
    }
  }, [selectedCoin, selectedTimeframe, coin, dispatch]);

  const getSignalIcon = () => {
    if (!current) return <Minus className="w-8 h-8" />;
    if (current.type === 'BUY') return <TrendingUp className="w-8 h-8" />;
    if (current.type === 'SELL') return <TrendingDown className="w-8 h-8" />;
    return <Minus className="w-8 h-8" />;
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
      <div className="p-4 border-b border-[#2d2d3a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-lg font-semibold">AI Analysis</h3>
        </div>
        
        {analyzing && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[#8b5cf6] animate-spin" />
            <span className="text-sm text-[#64748b]">Analyzing...</span>
          </div>
        )}
      </div>

      <div className="p-4">
        {error ? (
          <div className="text-center py-8">
            <p className="text-[#ff3b30]">{error}</p>
          </div>
        ) : !current ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a24] flex items-center justify-center">
              <Brain className="w-8 h-8 text-[#64748b]" />
            </div>
            <p className="text-[#64748b]">Select a coin to get AI analysis</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={clsx('p-4 rounded-xl', getSignalBgColor())}>
              <div className="flex items-center justify-between mb-2">
                <div className={clsx('flex items-center gap-2', getSignalColor())}>
                  {getSignalIcon()}
                  <span className="text-2xl font-bold">{current.type}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#64748b]">Confidence</p>
                  <p className="text-xl font-bold text-[#8b5cf6]">{current.confidence}%</p>
                </div>
              </div>
              <p className="text-sm text-[#94a3b8]">{current.reasoning}</p>
            </div>

            {(current.entryPrice || current.stopLoss || current.takeProfit) && (
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

            {technicalFactors && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1a1a24] p-3 rounded-lg">
                  <p className="text-xs text-[#64748b] mb-1">RSI (14)</p>
                  <p className={clsx(
                    'font-bold',
                    technicalFactors.rsiSignal === 'oversold' ? 'text-[#00d26a]' :
                    technicalFactors.rsiSignal === 'overbought' ? 'text-[#ff3b30]' :
                    'text-[#94a3b8]'
                  )}>
                    {technicalFactors.rsi.toFixed(1)}
                  </p>
                </div>
                <div className="bg-[#1a1a24] p-3 rounded-lg">
                  <p className="text-xs text-[#64748b] mb-1">MACD</p>
                  <p className={clsx(
                    'font-bold',
                    technicalFactors.macd.histogram > 0 ? 'text-[#00d26a]' :
                    technicalFactors.macd.histogram < 0 ? 'text-[#ff3b30]' :
                    'text-[#94a3b8]'
                  )}>
                    {technicalFactors.macd.histogram > 0 ? '▲' : technicalFactors.macd.histogram < 0 ? '▼' : '−'}
                  </p>
                </div>
                <div className="bg-[#1a1a24] p-3 rounded-lg">
                  <p className="text-xs text-[#64748b] mb-1">Trend</p>
                  <p className={clsx(
                    'font-bold',
                    technicalFactors.trend === 'bullish' ? 'text-[#00d26a]' :
                    technicalFactors.trend === 'bearish' ? 'text-[#ff3b30]' :
                    'text-[#94a3b8]'
                  )}>
                    {technicalFactors.trend.toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {current.aiAnalysis && (
              <div className="bg-[#1a1a24] p-3 rounded-lg">
                <p className="text-xs text-[#64748b] mb-2">AI Insights</p>
                <p className="text-sm text-[#94a3b8]">{current.aiAnalysis}</p>
              </div>
            )}

            <div className="text-xs text-[#64748b]">
              <p>Timeframe: {selectedTimeframe}</p>
              {current.createdAt && <p>Updated: {formatDate(current.createdAt)}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
