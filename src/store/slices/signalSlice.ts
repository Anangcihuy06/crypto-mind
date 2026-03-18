import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Signal, TechnicalFactors } from '@/types';

interface SignalState {
  current: Signal | null;
  history: Signal[];
  technicalFactors: TechnicalFactors | null;
  analyzing: boolean;
  error: string | null;
}

const initialState: SignalState = {
  current: null,
  history: [],
  technicalFactors: null,
  analyzing: false,
  error: null,
};

const signalSlice = createSlice({
  name: 'signals',
  initialState,
  reducers: {
    setCurrentSignal(state, action: PayloadAction<Signal | null>) {
      state.current = action.payload;
      if (action.payload) {
        state.history.unshift(action.payload);
        if (state.history.length > 100) {
          state.history = state.history.slice(0, 100);
        }
      }
    },
    setHistory(state, action: PayloadAction<Signal[]>) {
      state.history = action.payload;
    },
    setTechnicalFactors(state, action: PayloadAction<TechnicalFactors | null>) {
      state.technicalFactors = action.payload;
    },
    setAnalyzing(state, action: PayloadAction<boolean>) {
      state.analyzing = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.analyzing = false;
    },
    clearSignal(state) {
      state.current = null;
      state.technicalFactors = null;
    },
    updateSignalResult(state, action: PayloadAction<{
      signalId: string;
      result: 'WIN' | 'LOSS' | 'BREAKEVEN';
      evaluationPrice: number;
    }>) {
      const { signalId, result, evaluationPrice } = action.payload;
      const signal = state.history.find(s => s.id === signalId);
      if (signal) {
        signal.status = 'CLOSED';
        signal.result = result;
        signal.evaluationPrice = evaluationPrice;
        signal.evaluatedAt = Date.now();
      }
      if (state.current && state.current.id === signalId) {
        state.current.status = 'CLOSED';
        state.current.result = result;
        state.current.evaluationPrice = evaluationPrice;
        state.current.evaluatedAt = Date.now();
      }
    },
  },
});

export const {
  setCurrentSignal,
  setHistory,
  setTechnicalFactors,
  setAnalyzing,
  setError,
  clearSignal,
  updateSignalResult,
} = signalSlice.actions;

export default signalSlice.reducer;
