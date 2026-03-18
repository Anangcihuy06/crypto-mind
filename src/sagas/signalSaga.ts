import { call, put, select, takeLatest, all, delay, fork, take } from 'redux-saga/effects';
import { setCurrentSignal, setTechnicalFactors, setAnalyzing, setError, updateSignalResult } from '@/store/slices/signalSlice';
import { analyzeMarketWithAI, calculateTechnicalFactors } from '@/services/claude';
import { fetchKlines, fetchTicker } from '@/services/binance';
import type { RootState } from '@/store';
import type { Signal, Coin, Timeframe, CandleData } from '@/types';
import { generateId } from '@/utils/formatters';
import { TIMEFRAME_INTERVALS } from '@/utils/constants';

const TIMEFRAME_EVALUATION_MS: Record<Timeframe, number> = {
  '1H': 60 * 60 * 1000,
  '4H': 4 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
};

interface AnalyzeAction {
  type: string;
  payload: {
    coin: Coin;
    timeframe: Timeframe;
  };
}

function getHigherTimeframe(timeframe: Timeframe): Timeframe | null {
  if (timeframe === '1H') return '4H';
  if (timeframe === '4H') return '1D';
  return null;
}

function* analyzeMarketSaga(action: AnalyzeAction): Generator<any, void, any> {
  const { coin, timeframe = action.payload.timeframe } = action.payload;
  
  if (!timeframe) {
    console.error('No timeframe provided');
    return;
  }
  
  yield put(setAnalyzing(true));
  yield put(setError(null));
  
  try {
    const symbol = `${coin.symbol}/USDT`;
    
    const candles = yield call(fetchKlines, symbol, timeframe, 200);
    
    if (!candles || candles.length === 0) {
      throw new Error('No candle data available');
    }
    
    const technicalFactors = calculateTechnicalFactors(candles, coin);
    yield put(setTechnicalFactors(technicalFactors));
    
    let higherTimeframeCandles: CandleData[] | undefined;
    const higherTF = getHigherTimeframe(timeframe);
    
    if (higherTF) {
      try {
        higherTimeframeCandles = yield call(fetchKlines, symbol, higherTF, 50);
      } catch (e) {
        console.warn('Failed to fetch higher timeframe data:', e);
      }
    }
    
    const aiAnalysis = yield call(
      analyzeMarketWithAI, 
      coin, 
      candles, 
      technicalFactors, 
      timeframe,
      higherTimeframeCandles
    );
    
    const signal: Signal = {
      id: generateId(),
      symbol: coin.symbol,
      type: aiAnalysis.type || 'HOLD',
      confidence: aiAnalysis.confidence || 50,
      timeframe,
      price: coin.price,
      entryPrice: aiAnalysis.entryPrice || coin.price,
      stopLoss: aiAnalysis.stopLoss,
      takeProfit: aiAnalysis.takeProfit,
      riskRewardRatio: aiAnalysis.riskRewardRatio,
      reasoning: aiAnalysis.reasoning || 'Analysis based on technical factors',
      technicalFactors,
      aiAnalysis: aiAnalysis.aiAnalysis,
      sources: aiAnalysis.sources || ['Technical Analysis'],
      model: aiAnalysis.model,
      createdAt: Date.now(),
      status: 'PENDING',
    };
    
    yield put(setCurrentSignal(signal));
    
  } catch (error: any) {
    console.error('Analysis error:', error);
    yield put(setError(error.message || 'Analysis failed'));
  } finally {
    yield put(setAnalyzing(false));
  }
}

function* evaluateSignalSaga(signal: Signal): Generator<any, void, any> {
  try {
    const evaluationMs = TIMEFRAME_EVALUATION_MS[signal.timeframe];
    const elapsed = Date.now() - signal.createdAt;
    
    if (elapsed < evaluationMs) {
      return;
    }
    
    if (signal.status === 'CLOSED') {
      return;
    }
    
    const ticker = yield call(fetchTicker, signal.symbol);
    const currentPrice = ticker.price;
    
    let result: 'WIN' | 'LOSS' | 'BREAKEVEN';
    const priceChange = currentPrice - signal.entryPrice;
    const threshold = signal.entryPrice * 0.001;
    
    if (Math.abs(priceChange) < threshold) {
      result = 'BREAKEVEN';
    } else if (signal.type === 'BUY') {
      result = priceChange > 0 ? 'WIN' : 'LOSS';
    } else if (signal.type === 'SELL') {
      result = priceChange < 0 ? 'WIN' : 'LOSS';
    } else {
      return;
    }
    
    yield put(updateSignalResult({
      signalId: signal.id,
      result,
      evaluationPrice: currentPrice,
    }));
    
  } catch (error) {
    console.error('Error evaluating signal:', error);
  }
}

function* watchForEvaluation(): Generator<any, void, any> {
  while (true) {
    yield delay(60000);
    
    const state: RootState = yield select();
    const { history } = state.signals;
    
    const pendingSignals = history.filter(s => s.status === 'PENDING');
    
    for (const signal of pendingSignals) {
      yield fork(evaluateSignalSaga, signal);
    }
  }
}

export default function* signalSaga(): Generator<any, void, any> {
  yield fork(watchForEvaluation);
  yield takeLatest('signals/analyze', analyzeMarketSaga);
}
