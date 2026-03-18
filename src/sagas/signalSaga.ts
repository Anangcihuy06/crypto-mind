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
    
    const validatedSignal = validateSignal(aiAnalysis, technicalFactors, coin.price);
    
    const signal: Signal = {
      id: generateId(),
      symbol: coin.symbol,
      type: validatedSignal.type,
      confidence: validatedSignal.confidence,
      timeframe,
      price: coin.price,
      entryPrice: aiAnalysis.entryPrice || coin.price,
      stopLoss: aiAnalysis.stopLoss,
      takeProfit: aiAnalysis.takeProfit,
      riskRewardRatio: aiAnalysis.riskRewardRatio,
      reasoning: validatedSignal.reasoning,
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

function validateSignal(signal: Partial<Signal>, technicalFactors: any, currentPrice: number): { type: 'BUY' | 'SELL' | 'HOLD', confidence: number, reasoning: string } {
  const type = signal.type || 'HOLD';
  let confidence = signal.confidence || 50;
  let reasoning = signal.reasoning || '';
  
  let finalType: 'BUY' | 'SELL' | 'HOLD' = type === 'BUY' || type === 'SELL' ? type : 'HOLD';

  if (!type || type === 'HOLD') {
    return { type: 'HOLD', confidence, reasoning: reasoning || 'No clear signal' };
  }

  let adjustedConfidence = confidence;
  let adjustedReasoning = reasoning;

  const trend = technicalFactors?.trend || 'neutral';
  const rsi = technicalFactors?.rsi || 50;
  const macdHistogram = technicalFactors?.macd?.histogram || 0;
  
  let conflictingFactors = 0;
  let confirmingFactors = 0;

  if (type === 'BUY') {
    if (trend === 'bearish') conflictingFactors++;
    else confirmingFactors++;
    
    if (rsi > 60) conflictingFactors++;
    else if (rsi < 45) confirmingFactors++;
    
    if (macdHistogram < 0) conflictingFactors++;
    else confirmingFactors++;

    if (currentPrice > technicalFactors?.movingAverages?.sma50) confirmingFactors++;
    else conflictingFactors++;
  } else if (type === 'SELL') {
    if (trend === 'bullish') conflictingFactors++;
    else confirmingFactors++;
    
    if (rsi < 40) conflictingFactors++;
    else if (rsi > 55) confirmingFactors++;
    
    if (macdHistogram > 0) conflictingFactors++;
    else confirmingFactors++;

    if (currentPrice < technicalFactors?.movingAverages?.sma50) confirmingFactors++;
    else conflictingFactors++;
  }

  if (conflictingFactors >= 2) {
    console.log(`Signal validation: ${type} has ${conflictingFactors} conflicting factors, downgrading to HOLD`);
    finalType = 'HOLD';
    adjustedConfidence = Math.max(adjustedConfidence - 30, 20);
    adjustedReasoning = `${reasoning}. WARNING: Multiple conflicting indicators detected (${conflictingFactors} factors against signal). Validated as HOLD to prevent false signal.`;
  } else if (conflictingFactors === 1 && confirmingFactors < 2) {
    adjustedConfidence = Math.max(adjustedConfidence - 15, 30);
    adjustedReasoning = `${reasoning}. Note: One conflicting indicator detected, confidence reduced.`;
  }

  return { type: finalType, confidence: adjustedConfidence, reasoning: adjustedReasoning };
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
