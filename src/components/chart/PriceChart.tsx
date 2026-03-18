'use client';

import { useEffect, useRef, useCallback } from 'react';
import { CandlestickSeries, createChart, Time } from 'lightweight-charts';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedTimeframe } from '@/store/slices/marketSlice';
import { klineWS, type KlineData } from '@/services/binance';
import type { Timeframe } from '@/types';
import { TIMEFRAME_INTERVALS } from '@/utils/constants';

const timeframes: Timeframe[] = ['1H', '4H', '1D', '1W'];

export function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const lastKlineRef = useRef<KlineData | null>(null);
  
  const dispatch = useAppDispatch();
  const { candles, selectedCoin, selectedTimeframe, candlesLoading } = useAppSelector(
    (state) => state.market
  );

  const handleKlineUpdate = useCallback((data: KlineData) => {
    if (!candleSeriesRef.current || !data) return;

    const candleData = {
      time: data.time as Time,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
    };

    if (lastKlineRef.current && lastKlineRef.current.time === data.time) {
      candleSeriesRef.current.update(candleData);
    } else {
      lastKlineRef.current = data;
    }
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#12121a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#2d2d3a' },
        horzLines: { color: '#2d2d3a' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2d2d3a',
      },
      timeScale: {
        borderColor: '#2d2d3a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00d26a',
      downColor: '#ff3b30',
      borderUpColor: '#00d26a',
      borderDownColor: '#ff3b30',
      wickUpColor: '#00d26a',
      wickDownColor: '#ff3b30',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    lastKlineRef.current = null;
    
    if (candleSeriesRef.current && candles.length > 0) {
      const chartData = candles.map((candle) => ({
        time: candle.time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      candleSeriesRef.current.setData(chartData);
      
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [candles]);

  useEffect(() => {
    if (!selectedCoin || !selectedTimeframe) return;

    const interval = TIMEFRAME_INTERVALS[selectedTimeframe];
    klineWS.connect(selectedCoin, interval);
    klineWS.subscribe(selectedCoin, handleKlineUpdate);

    return () => {
      klineWS.unsubscribe(selectedCoin);
    };
  }, [selectedCoin, selectedTimeframe, handleKlineUpdate]);

  const handleTimeframeChange = (tf: Timeframe) => {
    lastKlineRef.current = null;
    dispatch(setSelectedTimeframe(tf));
  };

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] overflow-hidden">
      <div className="p-4 border-b border-[#2d2d3a] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">{selectedCoin}/USDT</h3>
          <div className="flex items-center gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-[#8b5cf6] text-white'
                    : 'bg-[#1a1a24] text-[#94a3b8] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        
        {candlesLoading && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#64748b]">Loading...</span>
          </div>
        )}
      </div>

      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
}
