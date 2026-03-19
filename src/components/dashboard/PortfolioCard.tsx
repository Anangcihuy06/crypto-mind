'use client';

import { Wallet, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { formatPrice, formatPercentage } from '@/utils/formatters';

export function PortfolioCard() {
  const { paperBalance, positions, totalPnL, totalPnLPercentage, trades } = useAppSelector(
    (state) => state.portfolio
  );

  const totalValue = positions.reduce((acc, pos) => acc + pos.value, 0);
  const totalPortfolioValue = paperBalance + totalValue;

  return (
    <div className="bg-[#12121a] rounded-xl p-4 lg:p-6 border border-[#2d2d3a]">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-[#8b5cf6]" />
        <h2 className="text-base lg:text-lg font-semibold">Portfolio Overview</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div>
          <p className="text-xs lg:text-sm text-[#64748b] mb-1">Total Value</p>
          <p className="text-lg lg:text-2xl font-bold">${formatPrice(totalPortfolioValue)}</p>
        </div>

        <div>
          <p className="text-xs lg:text-sm text-[#64748b] mb-1">Balance</p>
          <p className="text-lg lg:text-2xl font-bold text-[#3b82f6]">${formatPrice(paperBalance)}</p>
        </div>

        <div>
          <p className="text-xs lg:text-sm text-[#64748b] mb-1">Positions</p>
          <p className="text-lg lg:text-2xl font-bold">${formatPrice(totalValue)}</p>
        </div>

        <div>
          <p className="text-xs lg:text-sm text-[#64748b] mb-1">P&L</p>
          <div className="flex items-center gap-1 lg:gap-2">
            {totalPnL >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#00d26a] hidden sm:block" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#ff3b30] hidden sm:block" />
            )}
            <span
              className={`text-lg lg:text-2xl font-bold ${totalPnL >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'}`}
            >
              {totalPnL >= 0 ? '+' : ''}${formatPrice(totalPnL)}
            </span>
          </div>
          <p className={`text-xs ${totalPnLPercentage >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'}`}>
            {formatPercentage(totalPnLPercentage)}
          </p>
        </div>
      </div>

      <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-[#2d2d3a] flex gap-4 lg:gap-6 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Percent className="w-4 h-4 text-[#64748b]" />
          <span className="text-sm text-[#64748b]">
            {positions.length} Positions
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Percent className="w-4 h-4 text-[#64748b]" />
          <span className="text-sm text-[#64748b]">{trades.length} Trades</span>
        </div>
      </div>
    </div>
  );
}
