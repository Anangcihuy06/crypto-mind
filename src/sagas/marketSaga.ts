import { call, put, takeLatest, select, delay, fork, take, cancelled } from 'redux-saga/effects';
import { fetchMarketData } from '@/services/coinMarketCap';
import { fetchKlines, binanceWS, TickerData } from '@/services/binance';
import { setCoins, setLoading, setCandles, setCandlesLoading, setError, setSelectedCoin, setSelectedTimeframe, updatePrice } from '@/store/slices/marketSlice';
import { updatePositionsPrices } from '@/store/slices/portfolioSlice';
import { store } from '@/store';
import type { RootState } from '@/store';
import type { Coin } from '@/types';

let wsConnected = false;

function* fetchMarketDataSaga(): Generator<any, void, any> {
  yield put(setLoading(true));
  
  try {
    const coins: Coin[] = yield call(fetchMarketData, 50);
    yield put(setCoins(coins));
    
    const prices: Record<string, number> = {};
    coins.forEach((coin: Coin) => {
      prices[coin.symbol] = coin.price;
    });
    yield put(updatePositionsPrices(prices));
    
    const state: RootState = yield select();
    if (!state.market.candles || state.market.candles.length === 0) {
      yield call(fetchCandlesSaga);
    }
    
    if (!wsConnected) {
      yield fork(connectWebSocketSaga, coins.slice(0, 20).map((c: Coin) => c.symbol));
    }
    
  } catch (error: any) {
    yield put(setError(error.message || 'Failed to fetch market data'));
  } finally {
    if (!(yield cancelled())) {
      yield put(setLoading(false));
    }
  }
}

function* fetchCandlesSaga(): Generator<any, void, any> {
  const state: RootState = yield select();
  const { selectedCoin, selectedTimeframe } = state.market;
  
  if (!selectedCoin) return;
  
  yield put(setCandlesLoading(true));
  
  try {
    const candles = yield call(fetchKlines, selectedCoin, selectedTimeframe, 200);
    yield put(setCandles(candles));
  } catch (error: any) {
    yield put(setError(error.message || 'Failed to fetch candle data'));
    yield put(setCandlesLoading(false));
  }
}

function* connectWebSocketSaga(symbols: string[]): Generator<any, void, any> {
  try {
    console.log('Connecting WebSocket for symbols:', symbols);
    binanceWS.connect(symbols);
    wsConnected = true;

    symbols.forEach((symbol: string) => {
      binanceWS.subscribe(symbol, (data: TickerData) => {
        console.log('Received ticker update:', data.symbol, data.price);
        store.dispatch(updatePrice({
          symbol: data.symbol,
          price: data.price,
          change24h: data.change24h,
        }));
        store.dispatch(updatePositionsPrices({
          [data.symbol]: data.price,
        }));
      });
    });
    
  } catch (error: any) {
    console.error('WebSocket connection error:', error);
    wsConnected = false;
    yield put(setError('Real-time connection failed, using cached data'));
  }
}

function* watchSelectedCoin(): Generator<any, void, any> {
  while (true) {
    yield take([setSelectedCoin.type, setSelectedTimeframe.type]);
    yield fork(fetchCandlesSaga);
  }
}

function* autoRefreshSaga(): Generator<any, void, any> {
  while (true) {
    yield delay(30000);
    
    const state: RootState = yield select();
    if (state.settings.autoRefresh) {
      yield fork(fetchMarketDataSaga);
    }
  }
}

function* reconnectWebSocketSaga(): Generator<any, void, any> {
  while (true) {
    yield delay(60000);
    
    if (!wsConnected) {
      const state: RootState = yield select();
      if (state.market.coins.length > 0) {
        console.log('Attempting to reconnect WebSocket...');
        const symbols = state.market.coins.slice(0, 20).map((c: Coin) => c.symbol);
        yield fork(connectWebSocketSaga, symbols);
      }
    }
  }
}

export default function* marketSaga(): Generator<any, void, any> {
  yield fork(watchSelectedCoin);
  yield fork(autoRefreshSaga);
  yield fork(reconnectWebSocketSaga);
  
  yield takeLatest('market/fetchMarketData', fetchMarketDataSaga);
}
