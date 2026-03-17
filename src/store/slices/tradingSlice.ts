import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Order } from '@/types';

interface TradingState {
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  limitPrice: number;
  side: 'BUY' | 'SELL';
  loading: boolean;
  error: string | null;
}

const initialState: TradingState = {
  orderType: 'MARKET',
  quantity: 0.001,
  limitPrice: 0,
  side: 'BUY',
  loading: false,
  error: null,
};

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    setOrderType(state, action: PayloadAction<'MARKET' | 'LIMIT'>) {
      state.orderType = action.payload;
    },
    setQuantity(state, action: PayloadAction<number>) {
      state.quantity = action.payload;
    },
    setLimitPrice(state, action: PayloadAction<number>) {
      state.limitPrice = action.payload;
    },
    setSide(state, action: PayloadAction<'BUY' | 'SELL'>) {
      state.side = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    resetTradingState(state) {
      state.quantity = 0.001;
      state.limitPrice = 0;
      state.error = null;
    },
  },
});

export const {
  setOrderType,
  setQuantity,
  setLimitPrice,
  setSide,
  setLoading,
  setError,
  resetTradingState,
} = tradingSlice.actions;

export default tradingSlice.reducer;
