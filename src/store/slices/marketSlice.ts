import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Coin, CandleData, Timeframe } from '@/types';

interface MarketState {
  coins: Coin[];
  selectedCoin: string;
  selectedTimeframe: Timeframe;
  candles: CandleData[];
  prices: Record<string, number>;
  loading: boolean;
  candlesLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  wsConnected: boolean;
  wsError: string | null;
  klineWsConnected: boolean;
  klineWsError: string | null;
  usePolling: boolean;
}

const initialState: MarketState = {
  coins: [],
  selectedCoin: 'BTC',
  selectedTimeframe: '1H',
  candles: [],
  prices: {},
  loading: false,
  candlesLoading: false,
  error: null,
  lastUpdated: null,
  wsConnected: false,
  wsError: null,
  klineWsConnected: false,
  klineWsError: null,
  usePolling: false,
};

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setCoins(state, action: PayloadAction<Coin[]>) {
      state.coins = action.payload;
      state.lastUpdated = Date.now();
      state.error = null;
    },
    setSelectedCoin(state, action: PayloadAction<string>) {
      state.selectedCoin = action.payload;
      state.candles = [];
    },
    setSelectedTimeframe(state, action: PayloadAction<Timeframe>) {
      state.selectedTimeframe = action.payload;
      state.candles = [];
    },
    setCandles(state, action: PayloadAction<CandleData[]>) {
      state.candles = action.payload;
      state.candlesLoading = false;
    },
    setPrices(state, action: PayloadAction<Record<string, number>>) {
      state.prices = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setCandlesLoading(state, action: PayloadAction<boolean>) {
      state.candlesLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    updatePrice(state, action: PayloadAction<{ symbol: string; price: number; change24h: number }>) {
      const { symbol, price, change24h } = action.payload;
      state.prices[symbol] = price;
      const coin = state.coins.find(c => c.symbol === symbol);
      if (coin) {
        coin.price = price;
        coin.change24h = change24h;
      }
    },
    setWsConnected(state, action: PayloadAction<boolean>) {
      state.wsConnected = action.payload;
      if (action.payload) {
        state.wsError = null;
        state.usePolling = false;
      }
    },
    setWsError(state, action: PayloadAction<string | null>) {
      state.wsError = action.payload;
      state.wsConnected = false;
      if (action.payload) {
        state.usePolling = true;
      }
    },
    setKlineWsConnected(state, action: PayloadAction<boolean>) {
      state.klineWsConnected = action.payload;
      if (action.payload) {
        state.klineWsError = null;
      }
    },
    setKlineWsError(state, action: PayloadAction<string | null>) {
      state.klineWsError = action.payload;
      state.klineWsConnected = false;
    },
  },
});

export const {
  setCoins,
  setSelectedCoin,
  setSelectedTimeframe,
  setCandles,
  setPrices,
  setLoading,
  setCandlesLoading,
  setError,
  updatePrice,
  setWsConnected,
  setWsError,
  setKlineWsConnected,
  setKlineWsError,
} = marketSlice.actions;

export default marketSlice.reducer;
