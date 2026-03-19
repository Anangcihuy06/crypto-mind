import { call, put, takeLatest, select, delay, fork, take, cancelled } from 'redux-saga/effects';
import { fetchMarketData } from '@/services/coinMarketCap';
import { fetchKlines, fetchMultipleTickers, binanceWS, TickerData, WsConnectionStatus } from '@/services/binance';
import {
  setCoins,
  setLoading,
  setCandles,
  setCandlesLoading,
  setError,
  updatePrice,
  setWsConnected,
  setWsError,
  setSelectedCoin,
  setSelectedTimeframe,
} from '@/store/slices/marketSlice';
import { updatePositionsPrices } from '@/store/slices/portfolioSlice';
import { store } from '@/store';
import type { RootState } from '@/store';
import type { Coin } from '@/types';

const POLLING_INTERVAL = 60000;
const MAX_WS_SYMBOLS = 10;

let wsUnsubscribers: (() => void)[] = [];
let wsStatusUnsubscribe: (() => void) | null = null;

function* fetchMarketDataSaga(): Generator {
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

    if (!state.market.wsConnected) {
      yield fork(connectWebSocketSaga, coins.slice(0, MAX_WS_SYMBOLS).map((c: Coin) => c.symbol));
    }
  } catch (error: unknown) {
    yield put(setError((error as Error).message || 'Failed to fetch market data'));
  } finally {
    if (!(yield cancelled())) {
      yield put(setLoading(false));
    }
  }
}

function* fetchCandlesSaga(): Generator {
  const state: RootState = yield select();
  const { selectedCoin, selectedTimeframe } = state.market;

  if (!selectedCoin) return;

  yield put(setCandlesLoading(true));

  try {
    const candles = yield call(fetchKlines, selectedCoin, selectedTimeframe, 200);
    yield put(setCandles(candles as ReturnType<typeof setCandles>['payload']));
  } catch (error: unknown) {
    yield put(setError((error as Error).message || 'Failed to fetch candle data'));
    yield put(setCandlesLoading(false));
  }
}

function* connectWebSocketSaga(symbols: string[]): Generator {
  cleanupWebSocket();

  yield put(setWsError(null));

  binanceWS.connect(symbols);

  wsStatusUnsubscribe = binanceWS.onStatusChange((status: WsConnectionStatus, error?: string) => {
    console.log('[Saga] WebSocket status changed:', status, error);
    if (status === 'connected') {
      store.dispatch(setWsConnected(true));
      store.dispatch(setWsError(null));
    } else if (status === 'disconnected' || status === 'error') {
      store.dispatch(setWsConnected(false));
      if (error) {
        store.dispatch(setWsError(error));
      }
    }
  });

  const tickerHandler = (data: TickerData) => {
    store.dispatch(updatePrice({
      symbol: data.symbol,
      price: data.price,
      change24h: data.change24h,
    }));
    store.dispatch(updatePositionsPrices({
      [data.symbol]: data.price,
    }));
  };

  symbols.forEach((symbol: string) => {
    binanceWS.subscribe(symbol, tickerHandler);
    wsUnsubscribers.push(() => binanceWS.unsubscribe(symbol));
  });

  yield delay(5000);

  const state: RootState = yield select();
  if (!state.market.wsConnected && !state.market.usePolling) {
    yield put(setWsError('WebSocket connection timed out, switching to polling'));
  }
}

function cleanupWebSocket() {
  if (wsStatusUnsubscribe) {
    wsStatusUnsubscribe();
    wsStatusUnsubscribe = null;
  }
  wsUnsubscribers.forEach(unsub => unsub());
  wsUnsubscribers = [];
}

function* pollingFallbackSaga(): Generator {
  while (true) {
    yield delay(POLLING_INTERVAL);

    const state: RootState = yield select();
    if (!state.market.wsConnected || state.market.usePolling) {
      if (state.market.coins.length > 0 && state.settings.autoRefresh) {
        try {
          console.log('[Saga] Polling for price updates...');
          const pollSymbols = state.market.coins.slice(0, MAX_WS_SYMBOLS).map((c: Coin) => c.symbol);
          const tickers = yield call(fetchMultipleTickers, pollSymbols);

          tickers.forEach((ticker: TickerData, index: number) => {
            if (ticker && ticker.price) {
              const symbol = pollSymbols[index] || 'UNKNOWN';
              store.dispatch(updatePrice({
                symbol,
                price: ticker.price,
                change24h: ticker.change24h,
              }));
              store.dispatch(updatePositionsPrices({
                [symbol]: ticker.price,
              }));
            }
          });
        } catch (error) {
          console.error('[Saga] Polling error:', error);
        }
      }
    }
  }
}

function* watchSelectedCoin(): Generator {
  while (true) {
    yield take([setSelectedCoin.type, setSelectedTimeframe.type]);
    yield call(fetchCandlesSaga);
  }
}

function* autoRefreshSaga(): Generator {
  while (true) {
    yield delay(30000);

    const state: RootState = yield select();
    if (state.settings.autoRefresh && !state.market.wsConnected) {
      yield call(fetchMarketDataSaga);
    }
  }
}

export default function* marketSaga(): Generator {
  yield fork(watchSelectedCoin);
  yield fork(autoRefreshSaga);
  yield fork(pollingFallbackSaga);

  yield takeLatest('market/fetchMarketData', fetchMarketDataSaga);
}
