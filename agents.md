# CryptoMind - Agent Guidelines

## Project Overview
AI-powered crypto trading application built with Next.js 14 (App Router), TypeScript (strict mode), Redux Toolkit + Redux Saga, Tailwind CSS v4, and TradingView Lightweight Charts.

## Technology Stack
| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| State Management | Redux Toolkit + Redux Saga |
| Styling | Tailwind CSS v4 |
| Charts | TradingView Lightweight Charts |
| AI Analysis | Claude (Anthropic API) |
| Market Data | CoinGecko API (primary, free) |
| Real-time | Binance WebSocket (primary, free) |

---

## Commands
```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Build & Production
npm run build        # Production build
npm run start        # Start production server

# Linting & Type Checking
npm run lint         # Run ESLint (eslint-config-next/core-web-vitals)
```

**Note**: No test framework is currently configured. If adding tests, use Vitest with React Testing Library.

---

## Directory Structure
```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── api/          # Server-side API routes (market, candles, analyze)
│   ├── markets/      # Market overview page
│   ├── trading/      # Trading interface page
│   ├── signals/      # AI signals page
│   └── history/      # Trade history page
├── components/       # React components (layout, chart, dashboard, trading)
├── config/           # Configuration (AI config)
├── sagas/            # Redux Saga generators (market, signal, trading, root)
├── services/         # External API services (binance, coinMarketCap, claude)
├── store/            # Redux store & slices
│   ├── slices/       # marketSlice, portfolioSlice, signalSlice, tradingSlice, settingsSlice
│   └── hooks.ts      # Typed hooks (useAppSelector, useAppDispatch)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions (technicalAnalysis, formatters, constants)
```

---

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** - no implicit any, strict null checks
- Use `type` for unions/aliases, `interface` for object shapes
- Always use explicit types for function parameters and return types
- Path alias: `@/*` maps to `./src/*`

### Imports Order
```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { NextResponse } from 'next/server';

// 2. External libraries
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';

// 3. Internal imports (use @/ path alias)
import { setCoins } from '@/store/slices/marketSlice';
import type { Coin, CandleData } from '@/types';
import { formatPrice } from '@/utils/formatters';
```

### File Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AISignalCard.tsx` |
| Pages | kebab-case | `trading/page.tsx` |
| Slices | kebab-case | `market-slice.ts` |
| Sagas | kebab-case | `market-saga.ts` |
| Utilities | kebab-case | `formatters.ts` |
| Services | camelCase | `binance.ts` |
| Config | camelCase | `ai.ts` |

### Components
```typescript
'use client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger';
}

export function Component({ className, children, variant = 'default' }: Props) {
  return (
    <div className={twMerge(clsx('base-classes', variant === 'success' && 'text-green-500', className))}>
      {children}
    </div>
  );
}
```

### Redux Toolkit + Saga Pattern
```typescript
// Slice (src/store/slices/marketSlice.ts)
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MarketState {
  coins: Coin[];
  loading: boolean;
}

const initialState: MarketState = { coins: [], loading: false };

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setCoins(state, action: PayloadAction<Coin[]>) {
      state.coins = action.payload;
    },
  },
});

export const { setCoins } = marketSlice.actions;
export default marketSlice.reducer;

// Saga (src/sagas/marketSaga.ts)
import { call, put, takeLatest } from 'redux-saga/effects';

function* fetchCoins() {
  try {
    const response = yield call(axios.get, '/api/market');
    yield put(setCoins(response.data));
  } catch (error) {
    yield put(setError((error as Error).message));
  }
}

export default function* marketSaga() {
  yield takeLatest(fetchCoins.type, fetchCoins);
}
```

### Typed Redux Hooks
```typescript
// src/store/hooks.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### API Routes Pattern
```typescript
// src/app/api/market/route.ts
import { NextResponse } from 'next/server';

const CACHE_DURATION = 60000;
let marketCache: { data: unknown; timestamp: number } | null = null;

export async function GET() {
  if (marketCache && Date.now() - marketCache.timestamp < CACHE_DURATION) {
    return NextResponse.json(marketCache.data);
  }

  try {
    const response = await fetch('https://api.coingecko.com/...', { cache: 'no-store' });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed' }, { status: response.status });
    }
    
    const result = await response.json();
    marketCache = { data: result, timestamp: Date.now() };
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Error Handling
```typescript
try {
  const data = await fetchApi();
  return data;
} catch (error: unknown) {
  console.error('Detailed error:', error);
  throw new Error((error as Error).message || 'Fallback message');
}
```

---

## Architecture Rules

### API Strategy
```
Browser → Next.js API Routes → External APIs (CoinMarketCap, Binance)
              ↓
        Server-side proxy (no CORS issues)
```
**All external API calls MUST go through `/api/` routes.**
**Uses CoinMarketCap API only** - CoinGecko fallback removed.

### API Routes
| Route | Purpose | Cache TTL |
|-------|---------|-----------|
| `/api/market` | Top 50 coins (CoinMarketCap) | 60s |
| `/api/candles` | OHLCV data (Binance) | 60s |
| `/api/analyze` | AI analysis | No cache |

### WebSocket Architecture
- **Primary**: Binance WebSocket (`wss://stream.binance.com:9443/ws`) - free, no API key
- **Fallback**: CMC API polling (60s) when WebSocket blocked
- Auto-detects network restrictions and switches modes

---

## Theme Colors (Tailwind CSS v4)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-bg-primary` | `#0a0a0f` | Main background |
| `--color-bg-secondary` | `#12121a` | Cards |
| `--color-bg-tertiary` | `#1a1a24` | Nested elements |
| `--color-border` | `#2d2d3a` | Borders |
| `--color-accent-green` | `#00d26a` | Buy/Profit |
| `--color-accent-red` | `#ff3b30` | Sell/Loss |
| `--color-accent-purple` | `#8b5cf6` | AI elements |
| `--color-text-primary` | `#f8fafc` | Main text |
| `--color-text-secondary` | `#94a3b8` | Secondary text |

---

## Key Types
```typescript
// Core types in src/types/index.ts
type SignalType = 'BUY' | 'SELL' | 'HOLD';
type Timeframe = '1H' | '4H' | '1D' | '1W';

interface Coin { id, symbol, name, price, change24h, marketCap, ... }
interface CandleData { time, open, high, low, close, volume }
interface Position { id, symbol, side, entryPrice, quantity, pnl, ... }
interface Signal { symbol, type, confidence, reasoning, technicalFactors, aiAnalysis, ... }
```

---

## Symbol Mapping
### Binance WebSocket
```typescript
// Binance WebSocket: BTC → btcusdt
const SYMBOL_TO_BINANCE: Record<string, string> = { 'BTC': 'btcusdt', ... };
```

### CoinMarketCap API
```typescript
// CMC API: maps to CoinMarketCap IDs
const SYMBOL_TO_ID: Record<string, string> = { 'BTC': 'bitcoin', ... };
```

---

## Environment Variables
```env
CMC_API_KEY=<required-for-market-data>
OPENROUTER_API_KEY=<required-for-ai>
NEXT_PUBLIC_PAPER_BALANCE=10000
```

---

## Known Issues
1. **WebSocket blocked**: Shows "API Poll" status; system auto-falls back to polling
2. **CMC Rate Limited**: If CMC API fails, system uses in-memory cache
3. **CORS errors**: Ensure all API calls go through `/api/` routes

---

## Constants Reference (src/utils/constants.ts)
- `TIMEFRAME_INTERVALS`: Maps timeframes to API intervals
- `INDICATOR_DEFAULTS`: RSI (14, 70/30), MACD (12/26/9), BB (20, 2), MA (20/50/200)
- `CACHE_TTL`: prices=60s, candles=5min, marketStats=60s
