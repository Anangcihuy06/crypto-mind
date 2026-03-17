import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Settings, Timeframe } from '@/types';
import { DEFAULT_PAPER_BALANCE } from '@/utils/constants';

const initialState: Settings = {
  cmcApiKey: process.env.CMC_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  selectedTimeframe: '1H',
  autoRefresh: true,
  refreshInterval: 60000,
  paperBalance: DEFAULT_PAPER_BALANCE,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setCMCApiKey(state, action: PayloadAction<string>) {
      state.cmcApiKey = action.payload;
    },
    setAnthropicApiKey(state, action: PayloadAction<string>) {
      state.anthropicApiKey = action.payload;
    },
    setSelectedTimeframe(state, action: PayloadAction<Timeframe>) {
      state.selectedTimeframe = action.payload;
    },
    setAutoRefresh(state, action: PayloadAction<boolean>) {
      state.autoRefresh = action.payload;
    },
    setRefreshInterval(state, action: PayloadAction<number>) {
      state.refreshInterval = action.payload;
    },
    setPaperBalance(state, action: PayloadAction<number>) {
      state.paperBalance = action.payload;
    },
    loadSettings(state, action: PayloadAction<Partial<Settings>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const {
  setCMCApiKey,
  setAnthropicApiKey,
  setSelectedTimeframe,
  setAutoRefresh,
  setRefreshInterval,
  setPaperBalance,
  loadSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
