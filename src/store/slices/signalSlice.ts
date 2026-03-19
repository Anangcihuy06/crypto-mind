import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Signal, TechnicalFactors } from '@/types';

const STORAGE_KEY = 'cryptomind_signal_history';
const MAX_HISTORY = 100;

function loadPersistedHistory(): Signal[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading signal history:', e);
  }
  return [];
}

function saveHistoryToStorage(history: Signal[]) {
  if (typeof window === 'undefined') return;
  try {
    const toSave = history.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving signal history:', e);
  }
}

interface SignalState {
  current: Signal | null;
  history: Signal[];
  technicalFactors: TechnicalFactors | null;
  analyzing: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: SignalState = {
  current: null,
  history: [],
  technicalFactors: null,
  analyzing: false,
  error: null,
  initialized: false,
};

const signalSlice = createSlice({
  name: 'signals',
  initialState,
  reducers: {
    initializeHistory(state) {
      if (!state.initialized) {
        state.history = loadPersistedHistory();
        state.initialized = true;
      }
    },
    setCurrentSignal(state, action: PayloadAction<Signal | null>) {
      state.current = action.payload;
      if (action.payload) {
        state.history.unshift(action.payload);
        if (state.history.length > MAX_HISTORY) {
          state.history = state.history.slice(0, MAX_HISTORY);
        }
        saveHistoryToStorage(state.history);
      }
    },
    setHistory(state, action: PayloadAction<Signal[]>) {
      state.history = action.payload.slice(0, MAX_HISTORY);
      saveHistoryToStorage(state.history);
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
    clearHistory(state) {
      state.history = [];
      state.current = null;
      saveHistoryToStorage([]);
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
      saveHistoryToStorage(state.history);
    },
  },
});

export const {
  initializeHistory,
  setCurrentSignal,
  setHistory,
  setTechnicalFactors,
  setAnalyzing,
  setError,
  clearSignal,
  clearHistory,
  updateSignalResult,
} = signalSlice.actions;

export default signalSlice.reducer;
