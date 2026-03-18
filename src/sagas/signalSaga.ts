import { call, put, select, takeLatest, all } from 'redux-saga/effects';
import { setCurrentSignal, setTechnicalFactors, setAnalyzing, setError } from '@/store/slices/signalSlice';
import { analyzeMarketWithAI, calculateTechnicalFactors } from '@/services/claude';
import { fetchKlines } from '@/services/binance';
import type { RootState } from '@/store';
import type { Signal, Coin, Timeframe, CandleData } from '@/types';
import { generateId } from '@/utils/formatters';
import { TIMEFRAME_INTERVALS } from '@/utils/constants';

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
  const { coin, timeframe } = action.payload;
  
  yield put(setAnalyzing(true));
  yield put(setError(null));
  
  try {
    const symbol = `${coin.symbol}/USDT`;
    
    const [candles, higherTimeframeCandles] = yield all([
      call(fetchKlines, symbol, timeframe, 200),
      getHigherTimeframe(timeframe) 
        ? call(fetchKlines, symbol, getHigherTimeframe(timeframe)!, 100)
        : call(Promise.resolve, null)
    ]);
    
    if (!candles || candles.length === 0) {
      throw new Error('No candle data available');
    }
    
    const technicalFactors = calculateTechnicalFactors(candles, coin);
    yield put(setTechnicalFactors(technicalFactors));
    
    const aiAnalysis = yield call(
      analyzeMarketWithAI, 
      coin, 
      candles, 
      technicalFactors, 
      timeframe,
      higherTimeframeCandles || undefined
    );
    
    const signal: Signal = {
      id: generateId(),
      symbol: coin.symbol,
      type: aiAnalysis.type || 'HOLD',
      confidence: aiAnalysis.confidence || 50,
      timeframe,
      price: coin.price,
      entryPrice: aiAnalysis.entryPrice,
      stopLoss: aiAnalysis.stopLoss,
      takeProfit: aiAnalysis.takeProfit,
      riskRewardRatio: aiAnalysis.riskRewardRatio,
      reasoning: aiAnalysis.reasoning || 'Analysis based on technical factors',
      technicalFactors,
      aiAnalysis: aiAnalysis.aiAnalysis,
      sources: aiAnalysis.sources || ['Technical Analysis'],
      model: aiAnalysis.model,
      createdAt: Date.now(),
    };
    
    yield put(setCurrentSignal(signal));
    
  } catch (error: any) {
    yield put(setError(error.message || 'Analysis failed'));
  } finally {
    yield put(setAnalyzing(false));
  }
}

export default function* signalSaga(): Generator<any, void, any> {
  yield takeLatest('signals/analyze', analyzeMarketSaga);
}
