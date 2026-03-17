'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removePosition } from '@/store/slices/portfolioSlice';
import { formatPrice, formatPercentage, formatQuantity } from '@/utils/formatters';
import { clsx } from 'clsx';

export function PositionsList() {
  const dispatch = useAppDispatch();
  const { positions, paperBalance } = useAppSelector((state) => state.portfolio);
  const { prices } = useAppSelector((state) => state.market);

  const handleClosePosition = (positionId: string, symbol: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    dispatch({
      type: 'trading/placeOrder',
      payload: {
        symbol,
        side: 'SELL',
        quantity: position.quantity,
        price: prices[symbol],
        orderType: 'MARKET',
      },
    });
  };

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] overflow-hidden">
      <div className="p-4 border-b border-[#2d2d3a]">
        <h3 className="text-lg font-semibold">Open Positions</h3>
      </div>

      <div className="p-4">
        {positions.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[#64748b]" />
            <p className="text-[#64748b]">No open positions</p>
            <p className="text-sm text-[#64748b]">Start trading to see your positions here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position) => (
              <div
                key={position.id}
                className="bg-[#1a1a24] p-4 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{position.symbol}</span>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded',
                      position.side === 'LONG' ? 'bg-[#00d26a]/20 text-[#00d26a]' : 'bg-[#ff3b30]/20 text-[#ff3b30]'
                    )}>
                      {position.side}
                    </span>
                  </div>
                  <button
                    onClick={() => handleClosePosition(position.id, position.symbol)}
                    className="text-xs px-3 py-1 rounded bg-[#ff3b30] hover:bg-[#e6352b] transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[#64748b]">Entry Price</p>
                    <p className="text-white">${formatPrice(position.entryPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[#64748b]">Current Price</p>
                    <p className="text-white">${formatPrice(position.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[#64748b]">Quantity</p>
                    <p className="text-white">{formatQuantity(position.quantity)}</p>
                  </div>
                  <div>
                    <p className="text-[#64748b]">Value</p>
                    <p className="text-white">${formatPrice(position.value)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#2d2d3a] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {position.pnl >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-[#00d26a]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-[#ff3b30]" />
                    )}
                    <span className={clsx(
                      'font-bold',
                      position.pnl >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                    )}>
                      {position.pnl >= 0 ? '+' : ''}${formatPrice(position.pnl)}
                    </span>
                    <span className={clsx(
                      'text-sm',
                      position.pnlPercentage >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'
                    )}>
                      ({formatPercentage(position.pnlPercentage)})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
