import { call, put, select, takeLatest, delay } from 'redux-saga/effects';
import { addPosition, addTrade, removePosition, updatePosition, setPaperBalance } from '@/store/slices/portfolioSlice';
import { addOrder, updateOrder, removeOrder } from '@/store/slices/portfolioSlice';
import { setLoading, setError, setSide, setQuantity, resetTradingState } from '@/store/slices/tradingSlice';
import type { RootState } from '@/store';
import type { Position, Trade, Order } from '@/types';
import { generateId } from '@/utils/formatters';

interface PlaceOrderAction {
  type: string;
  payload: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    orderType: 'MARKET' | 'LIMIT';
  };
}

function* placeOrderSaga(action: PlaceOrderAction): Generator<any, void, any> {
  const { symbol, side, quantity: orderQty, price } = action.payload;
  let quantity = orderQty;
  
  yield put(setLoading(true));
  
  try {
    const state: RootState = yield select();
    const { paperBalance, positions } = state.portfolio;
    const currentPrice = price || state.market.prices[symbol] || 0;
    
    if (!currentPrice) {
      throw new Error('Price not available');
    }
    
    const value = currentPrice * quantity;
    
    if (side === 'BUY') {
      if (value > paperBalance) {
        throw new Error('Insufficient balance');
      }
      
      const newPosition: Position = {
        id: generateId(),
        symbol,
        side: 'LONG',
        entryPrice: currentPrice,
        currentPrice,
        quantity,
        value,
        pnl: 0,
        pnlPercentage: 0,
        openTime: Date.now(),
      };
      
      yield put(addPosition(newPosition));
      yield put(setPaperBalance(paperBalance - value));
      
    } else {
      const position = positions.find(p => p.symbol === symbol && p.side === 'LONG');
      
      if (!position) {
        throw new Error('No position to sell');
      }
      
      if (quantity > position.quantity) {
        quantity = position.quantity;
      }
      
      const sellValue = currentPrice * quantity;
      const pnl = (currentPrice - position.entryPrice) * quantity;
      
      const trade: Trade = {
        id: generateId(),
        symbol,
        side: 'SELL',
        price: currentPrice,
        quantity,
        value: sellValue,
        fee: sellValue * 0.001,
        timestamp: Date.now(),
        pnl,
      };
      
      yield put(addTrade(trade));
      yield put(setPaperBalance(paperBalance + sellValue - trade.fee));
      
      if (quantity >= position.quantity) {
        yield put(removePosition(position.id));
      } else {
        const remainingQty = position.quantity - quantity;
        yield put(updatePosition({
          id: position.id,
          updates: {
            quantity: remainingQty,
            value: remainingQty * currentPrice,
          },
        }));
      }
    }
    
    const trade: Trade = {
      id: generateId(),
      symbol,
      side,
      price: currentPrice,
      quantity,
      value,
      fee: value * 0.001,
      timestamp: Date.now(),
    };
    
    yield put(addTrade(trade));
    yield put(resetTradingState());
    
  } catch (error: any) {
    yield put(setError(error.message || 'Order failed'));
  } finally {
    yield put(setLoading(false));
  }
}

function* cancelOrderSaga(action: { type: string; payload: string }): Generator<any, void, any> {
  yield put(removeOrder(action.payload));
}

export default function* tradingSaga(): Generator<any, void, any> {
  yield takeLatest('trading/placeOrder', placeOrderSaga);
  yield takeLatest('trading/cancelOrder', cancelOrderSaga);
}
