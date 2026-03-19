'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useMobile } from '@/hooks/useMobile';
import { X } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobile } = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="flex-1 flex">
        {!isMobile && (
          <div className="w-64 shrink-0">
            <Sidebar />
          </div>
        )}

        {sidebarOpen && isMobile && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-[#12121a] z-50 animate-slide-in">
              <div className="flex items-center justify-between p-4 border-b border-[#2d2d3a]">
                <span className="font-semibold">Menu</span>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-[#1a1a24] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar />
            </div>
          </>
        )}

        <main className="flex-1 overflow-auto bg-[#0a0a0f]">
          <div className={`${isMobile ? 'p-4' : 'p-6'} ${isMobile ? 'pb-24' : ''}`}>
            {children}
          </div>
        </main>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}
