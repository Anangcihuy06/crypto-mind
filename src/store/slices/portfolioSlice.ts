import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Position, Trade, Order } from '@/types';
import { DEFAULT_PAPER_BALANCE } from '@/utils/constants';

interface PortfolioState {
  paperBalance: number;
  initialBalance: number;
  positions: Position[];
  trades: Trade[];
  openOrders: Order[];
  totalPnL: number;
  totalPnLPercentage: number;
}

const initialState: PortfolioState = {
  paperBalance: DEFAULT_PAPER_BALANCE,
  initialBalance: DEFAULT_PAPER_BALANCE,
  positions: [],
  trades: [],
  openOrders: [],
  totalPnL: 0,
  totalPnLPercentage: 0,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setPaperBalance(state, action: PayloadAction<number>) {
      state.paperBalance = action.payload;
    },
    setInitialBalance(state, action: PayloadAction<number>) {
      state.initialBalance = action.payload;
    },
    addPosition(state, action: PayloadAction<Position>) {
      state.positions.push(action.payload);
    },
    removePosition(state, action: PayloadAction<string>) {
      state.positions = state.positions.filter(p => p.id !== action.payload);
    },
    updatePosition(state, action: PayloadAction<{ id: string; updates: Partial<Position> }>) {
      const position = state.positions.find(p => p.id === action.payload.id);
      if (position) {
        Object.assign(position, action.payload.updates);
        position.pnl = (position.currentPrice - position.entryPrice) * position.quantity;
        position.pnlPercentage = (position.pnl / (position.entryPrice * position.quantity)) * 100;
      }
    },
    addTrade(state, action: PayloadAction<Trade>) {
      state.trades.unshift(action.payload);
      if (action.payload.pnl !== undefined) {
        state.totalPnL += action.payload.pnl;
        state.totalPnLPercentage = (state.totalPnL / state.initialBalance) * 100;
      }
    },
    addOrder(state, action: PayloadAction<Order>) {
      state.openOrders.push(action.payload);
    },
    updateOrder(state, action: PayloadAction<{ id: string; updates: Partial<Order> }>) {
      const order = state.openOrders.find(o => o.id === action.payload.id);
      if (order) {
        Object.assign(order, action.payload.updates);
      }
    },
    removeOrder(state, action: PayloadAction<string>) {
      state.openOrders = state.openOrders.filter(o => o.id !== action.payload);
    },
    updatePositionsPrices(state, action: PayloadAction<Record<string, number>>) {
      let totalPnL = 0;
      state.positions.forEach(position => {
        const currentPrice = action.payload[position.symbol];
        if (currentPrice) {
          position.currentPrice = currentPrice;
          position.value = currentPrice * position.quantity;
          position.pnl = (currentPrice - position.entryPrice) * position.quantity;
          position.pnlPercentage = (position.pnl / (position.entryPrice * position.quantity)) * 100;
          totalPnL += position.pnl;
        }
      });
      state.totalPnL = totalPnL;
      state.totalPnLPercentage = (totalPnL / state.initialBalance) * 100;
    },
    resetPortfolio(state) {
      state.paperBalance = state.initialBalance;
      state.positions = [];
      state.trades = [];
      state.openOrders = [];
      state.totalPnL = 0;
      state.totalPnLPercentage = 0;
    },
  },
});

export const {
  setPaperBalance,
  setInitialBalance,
  addPosition,
  removePosition,
  updatePosition,
  addTrade,
  addOrder,
  updateOrder,
  removeOrder,
  updatePositionsPrices,
  resetPortfolio,
} = portfolioSlice.actions;

export default portfolioSlice.reducer;
