'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { CandlestickSeries, createChart, Time, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedTimeframe, setKlineWsConnected, setKlineWsError, setCandles, setCandlesLoading } from '@/store/slices/marketSlice';
import { klineWS, type KlineData, WsConnectionStatus } from '@/services/binance';
import type { Timeframe, CandleData } from '@/types';
import { TIMEFRAME_INTERVALS } from '@/utils/constants';
import { Maximize2, Minimize2, X } from 'lucide-react';

const BINANCE_API = 'https://api.binance.com/api/v3';

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'BNB': 'BNBUSDT',
  'SOL': 'SOLUSDT',
  'XRP': 'XRPUSDT',
  'ADA': 'ADAUSDT',
  'DOGE': 'DOGEUSDT',
  'TRX': 'TRXUSDT',
  'AVAX': 'AVAXUSDT',
  'DOT': 'DOTUSDT',
  'LINK': 'LINKUSDT',
  'MATIC': 'MATICUSDT',
  'SHIB': 'SHIBUSDT',
  'LTC': 'LTCUSDT',
  'ATOM': 'ATOMUSDT',
  'UNI': 'UNIUSDT',
  'XLM': 'XLMUSDT',
  'ETC': 'ETCUSDT',
  'FIL': 'FILUSDT',
};

async function fetchCandlesClient(symbol: string, timeframe: Timeframe, limit = 200): Promise<CandleData[]> {
  const binanceSymbol = BINANCE_SYMBOL_MAP[symbol] || `${symbol}USDT`;
  const interval = TIMEFRAME_INTERVALS[timeframe];
  
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

const timeframes: Timeframe[] = ['1H', '4H', '1D', '1W'];

export function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const handleKlineUpdateRef = useRef<((data: KlineData) => void) | null>(null);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('disconnected');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

    candleSeriesRef.current.update(candleData);
  }, []);

  useEffect(() => {
    handleKlineUpdateRef.current = handleKlineUpdate;
  }, [handleKlineUpdate]);

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

    dispatch(setCandlesLoading(true));

    fetchCandlesClient(selectedCoin, selectedTimeframe, 200)
      .then((data) => {
        console.log('[Chart] Fetched', data.length, 'candles from Binance');
        dispatch(setCandles(data));
        dispatch(setCandlesLoading(false));
      })
      .catch((error) => {
        console.error('[Chart] Error fetching candles:', error);
        dispatch(setCandlesLoading(false));
      });

    const interval = TIMEFRAME_INTERVALS[selectedTimeframe];
    klineWS.connect(selectedCoin, interval);

    const statusUnsubscribe = klineWS.onStatusChange((status: WsConnectionStatus, error?: string) => {
      console.log('[Chart] Kline WebSocket status:', status, error);
      setWsStatus(status);
      if (status === 'connected') {
        dispatch(setKlineWsConnected(true));
        dispatch(setKlineWsError(null));
      } else if (status === 'error') {
        dispatch(setKlineWsConnected(false));
        dispatch(setKlineWsError(error || 'Connection error'));
      } else {
        dispatch(setKlineWsConnected(false));
      }
    });

    const currentSymbol = selectedCoin;
    klineWS.subscribe(selectedCoin, (data: KlineData) => {
      if (handleKlineUpdateRef.current) {
        handleKlineUpdateRef.current(data);
      }
    });

    return () => {
      statusUnsubscribe();
      klineWS.unsubscribe(currentSymbol);
    };
  }, [selectedCoin, selectedTimeframe, dispatch]);

  const handleTimeframeChange = (tf: Timeframe) => {
    dispatch(setSelectedTimeframe(tf));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getStatusColor = () => {
    switch (wsStatus) {
      case 'connected':
        return 'bg-[#00d26a]';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-[#ff3b30]';
      default:
        return 'bg-[#64748b]';
    }
  };

  const chartContent = (
    <>
      <div className="p-3 lg:p-4 border-b border-[#2d2d3a]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base lg:text-lg font-semibold">{selectedCoin}/USDT</h3>
            <div className="flex items-center gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-2 lg:px-3 py-1.5 text-xs lg:text-sm rounded-lg transition-colors active:scale-95 ${
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-xs lg:text-sm text-[#94a3b8] hidden sm:inline">
                {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>

            {candlesLoading && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs lg:text-sm text-[#64748b] hidden sm:inline">Loading...</span>
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-[#1a1a24] rounded-lg hover:bg-[#2d2d3a] transition-colors lg:hidden"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full flex-1 min-h-[300px] lg:min-h-[400px]" />
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0f] flex flex-col">
        <div className="p-3 border-b border-[#2d2d3a] flex items-center justify-between bg-[#12121a]">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{selectedCoin}/USDT</h3>
            <div className="flex items-center gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors active:scale-95 ${
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-sm text-[#94a3b8]">
                {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-[#1a1a24] rounded-lg hover:bg-[#2d2d3a] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={chartContainerRef} className="flex-1 w-full" />
      </div>
    );
  }

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] overflow-hidden flex flex-col h-[400px]">
      {chartContent}
    </div>
  );
}
