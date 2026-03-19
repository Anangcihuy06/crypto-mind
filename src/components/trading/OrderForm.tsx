'use client';

import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSide, setQuantity, setOrderType, setLimitPrice } from '@/store/slices/tradingSlice';
import { formatPrice } from '@/utils/formatters';
import { clsx } from 'clsx';

export function OrderForm() {
  const dispatch = useAppDispatch();
  const { side, quantity, orderType, limitPrice, loading, error } = useAppSelector(
    (state) => state.trading
  );
  const { paperBalance } = useAppSelector((state) => state.portfolio);
  const { selectedCoin, prices } = useAppSelector((state) => state.market);

  const currentPrice = prices[selectedCoin] || 0;
  const orderValue = currentPrice * quantity;
  const estimatedFee = orderValue * 0.001;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'trading/placeOrder',
      payload: {
        symbol: selectedCoin,
        side,
        quantity,
        price: orderType === 'LIMIT' ? limitPrice : undefined,
        orderType,
      },
    });
  };

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] overflow-hidden">
      <div className="p-4 border-b border-[#2d2d3a]">
        <h3 className="text-lg font-semibold">Trade {selectedCoin}/USDT</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="flex rounded-lg bg-[#1a1a24] p-1">
          <button
            type="button"
            onClick={() => dispatch(setSide('BUY'))}
            className={clsx(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
              side === 'BUY'
                ? 'bg-[#00d26a] text-white'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <ArrowUp className="w-4 h-4" />
            Buy
          </button>
          <button
            type="button"
            onClick={() => dispatch(setSide('SELL'))}
            className={clsx(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
              side === 'SELL'
                ? 'bg-[#ff3b30] text-white'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <ArrowDown className="w-4 h-4" />
            Sell
          </button>
        </div>

        <div className="flex rounded-lg bg-[#1a1a24] p-1">
          <button
            type="button"
            onClick={() => dispatch(setOrderType('MARKET'))}
            className={clsx(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              orderType === 'MARKET'
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => dispatch(setOrderType('LIMIT'))}
            className={clsx(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              orderType === 'LIMIT'
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            Limit
          </button>
        </div>

        {orderType === 'LIMIT' && (
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Price (USDT)</label>
            <input
              type="number"
              step="0.01"
              value={limitPrice}
              onChange={(e) => dispatch(setLimitPrice(parseFloat(e.target.value) || 0))}
              className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6]"
              placeholder="0.00"
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-[#94a3b8] mb-1">Quantity ({selectedCoin})</label>
          <input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => dispatch(setQuantity(parseFloat(e.target.value) || 0))}
            className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3b82f6]"
            placeholder="0.00"
          />
        </div>

        <div className="bg-[#1a1a24] p-3 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#64748b]">Current Price</span>
            <span className="text-white">${formatPrice(currentPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#64748b]">Order Value</span>
            <span className="text-white">${formatPrice(orderValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#64748b]">Est. Fee (0.1%)</span>
            <span className="text-white">${formatPrice(estimatedFee)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-[#2d2d3a]">
            <span className="text-[#64748b]">Available Balance</span>
            <span className="text-[#3b82f6]">${formatPrice(paperBalance)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-[#ff3b30]/10 border border-[#ff3b30] rounded-lg p-3">
            <p className="text-sm text-[#ff3b30]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || quantity <= 0 || !selectedCoin}
          className={clsx(
            'w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
            side === 'BUY'
              ? 'bg-[#00d26a] hover:bg-[#00b85c]'
              : 'bg-[#ff3b30] hover:bg-[#e6352b]',
            (loading || quantity <= 0 || !selectedCoin) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {side === 'BUY' ? 'Buy' : 'Sell'} {selectedCoin}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
