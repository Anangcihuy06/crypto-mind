'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, LayoutDashboard, LineChart, Radio, Wallet, History, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/markets', label: 'Markets', icon: LineChart },
  { href: '/signals', label: 'Signals', icon: Radio },
  { href: '/trading', label: 'Trading', icon: Wallet },
  { href: '/history', label: 'History', icon: History },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="h-16 bg-[#12121a] border-b border-[#2d2d3a] flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] bg-clip-text text-transparent">
            CryptoMind
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#1a1a24] text-white'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#1a1a24]'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a24] rounded-full text-xs">
          <span className="w-2 h-2 bg-[#00d26a] rounded-full animate-pulse" />
          <span className="text-[#94a3b8]">API Connected</span>
        </div>
        <button className="p-2 rounded-lg hover:bg-[#1a1a24] transition-colors">
          <Settings className="w-5 h-5 text-[#94a3b8]" />
        </button>
      </div>
    </header>
  );
}
