import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import marketReducer from './slices/marketSlice';
import portfolioReducer from './slices/portfolioSlice';
import signalReducer from './slices/signalSlice';
import tradingReducer from './slices/tradingSlice';
import settingsReducer from './slices/settingsSlice';
import rootSaga from '../sagas/rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    market: marketReducer,
    portfolio: portfolioReducer,
    signals: signalReducer,
    trading: tradingReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: false,
    }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
