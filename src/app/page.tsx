'use client';

import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/Layout';
import { PortfolioCard } from '@/components/dashboard/PortfolioCard';
import { PriceChart } from '@/components/chart/PriceChart';
import { AISignalCard } from '@/components/dashboard/AISignalCard';
import { OrderForm } from '@/components/trading/OrderForm';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedCoin } from '@/store/slices/marketSlice';

export default function Home() {
  const dispatch = useAppDispatch();
  const { coins, selectedCoin } = useAppSelector((state) => state.market);

  useEffect(() => {
    dispatch({ type: 'market/fetchMarketData' });
  }, [dispatch]);

  useEffect(() => {
    if (coins.length > 0 && !selectedCoin) {
      dispatch(setSelectedCoin('BTC'));
    }
  }, [coins, selectedCoin, dispatch]);

  const selectedCoinData = coins.find((c) => c.symbol === selectedCoin);

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        <PortfolioCard />

        {/* PriceChart full width on mobile */}
        <PriceChart />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="hidden lg:block lg:col-span-2">
            {selectedCoinData && (
              <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-6 h-full">
                <h3 className="text-lg font-semibold mb-4">{selectedCoinData.name} Overview</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Price</p>
                    <p className="text-xl font-bold">${selectedCoinData.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">24h Change</p>
                    <p className={`text-xl font-bold ${selectedCoinData.change24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'}`}>
                      {selectedCoinData.change24h >= 0 ? '+' : ''}{selectedCoinData.change24h.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Market Cap</p>
                    <p className="text-xl font-bold">${(selectedCoinData.marketCap / 1e9).toFixed(2)}B</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-1">Volume 24h</p>
                    <p className="text-xl font-bold">${(selectedCoinData.volume24h / 1e9).toFixed(2)}B</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <OrderForm />
          </div>
        </div>

        {/* Mobile: Card + OrderForm stacked */}
        <div className="lg:hidden space-y-4">
          {selectedCoinData && (
            <div className="bg-[#12121a] rounded-xl border border-[#2d2d3a] p-4">
              <h3 className="text-base font-semibold mb-3">{selectedCoinData.name} Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Price</p>
                  <p className="text-lg font-bold">${selectedCoinData.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">24h Change</p>
                  <p className={`text-lg font-bold ${selectedCoinData.change24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b30]'}`}>
                    {selectedCoinData.change24h >= 0 ? '+' : ''}{selectedCoinData.change24h.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Market Cap</p>
                  <p className="text-lg font-bold">${(selectedCoinData.marketCap / 1e9).toFixed(2)}B</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Volume 24h</p>
                  <p className="text-lg font-bold">${(selectedCoinData.volume24h / 1e9).toFixed(2)}B</p>
                </div>
              </div>
            </div>
          )}
          <OrderForm />
        </div>

        {/* AI Signal Card - full width on all screens */}
        <div className="hidden lg:block">
          <AISignalCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
