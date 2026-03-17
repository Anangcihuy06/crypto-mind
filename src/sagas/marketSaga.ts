import { call, put, takeLatest, select, delay, fork, take, cancelled } from 'redux-saga/effects';
import { fetchMarketData } from '@/services/coinMarketCap';
import { fetchKlines, binanceWS, TickerData } from '@/services/binance';
import { setCoins, setLoading, setCandles, setCandlesLoading, setError, setSelectedCoin, setSelectedTimeframe, updatePrice } from '@/store/slices/marketSlice';
import { updatePositionsPrices } from '@/store/slices/portfolioSlice';
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
    binanceWS.connect(symbols);
    wsConnected = true;

    symbols.forEach((symbol: string) => {
      binanceWS.subscribe(symbol, (data: TickerData) => {
        updatePrice({
          symbol: data.symbol,
          price: data.price,
          change24h: data.change24h,
        });
        
        updatePositionsPrices({
          [data.symbol]: data.price,
        });
      });
    });
    
  } catch (error: any) {
    console.error('WebSocket connection error:', error);
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

export default function* marketSaga(): Generator<any, void, any> {
  yield fork(watchSelectedCoin);
  yield fork(autoRefreshSaga);
  
  yield takeLatest('market/fetchMarketData', fetchMarketDataSaga);
}
