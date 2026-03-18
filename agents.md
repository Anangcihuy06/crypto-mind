# CryptoMind - Agent Guidelines

## Project Overview
AI-powered crypto trading application built with Next.js 14 (App Router), TypeScript, Redux Toolkit + Redux Saga, Tailwind CSS v4, and TradingView Lightweight Charts.

## Technology Stack
| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| State Management | Redux Toolkit + Redux Saga |
| Styling | Tailwind CSS v4 |
| Charts | TradingView Lightweight Charts |
| AI Analysis | Claude Sonnet 4.6 (Anthropic) |
| Market Data | CoinMarketCap API |
| Real-time | Binance WebSocket |

---

## Commands
```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Testing
No test framework configured. If adding tests:
- Use Vitest or Jest with React Testing Library
- Run single test: `npm test -- --testPathPattern="filename"`
- Or with Vitest: `npx vitest run filename.spec.ts`

---

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** in `tsconfig.json`
- Always use explicit types for function parameters and return types
- Use `type` for unions/aliases, `interface` for object shapes
- Use path alias `@/*` for imports

```typescript
// Good
function fetchData(symbol: string): Promise<Coin[]> { ... }

// Bad
function fetchData(symbol) { ... }
```

### Imports
```typescript
// External libraries
import { useState, useEffect } from 'react';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Path alias (use @/ for src/)
import { setCoins } from '@/store/slices/marketSlice';
import type { Coin, CandleData } from '@/types';
```

### Components
- Use function components
- Use `'use client'` directive for client-side components
- Use `clsx` and `tailwind-merge` for conditional classes

```typescript
'use client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
  className?: string;
  children: React.ReactNode;
}

export function Component({ className, children }: Props) {
  return (
    <div className={twMerge(clsx('base-classes', className))}>
      {children}
    </div>
  );
}
```

### Redux Toolkit + Saga
- Slices: Use `createSlice` with immer enabled
- Use typed hooks (`useAppSelector`, `useAppDispatch` from `@/store/hooks`)
- Sagas: Use generator functions with proper typing

```typescript
// Slice
const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setCoins(state, action: PayloadAction<Coin[]>) {
      state.coins = action.payload;
    },
  },
});

// Saga
function* fetchDataSaga(): Generator<any, void, any> {
  try {
    const data = yield call(fetchApi);
    yield put(setCoins(data));
  } catch (error: any) {
    yield put(setError(error.message || 'Failed to fetch'));
  }
}
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AISignalCard` |
| Functions | camelCase | `formatPrice` |
| Variables | camelCase | `selectedCoin` |
| Constants | UPPER_SNAKE | `TIMEFRAME_INTERVALS` |
| Types/Interfaces | PascalCase | `Coin`, `CandleData` |
| Files | kebab-case | `market-slice.ts` |

### Error Handling
- Always use try/catch for async operations
- Provide fallback error messages
- Handle errors in Redux with `setError` action

```typescript
try {
  const data = await fetchApi();
  return data;
} catch (error: any) {
  console.error('Error fetching data:', error);
  throw new Error(error.message || 'Failed to fetch data');
}
```

### Tailwind CSS v4
Uses `@theme` directive in `globals.css` for custom colors.

---

## Theme Colors Reference
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
| `--color-text-muted` | `#64748b` | Muted text |

---

## API Integration
- `/api/market` - CMC API proxy (returns top 50 cryptocurrencies)
- `/api/candles?symbol=BTC&timeframe=1h` - Binance API proxy
- `/api/analyze` - Claude AI proxy for market analysis
- WebSocket: `wss://stream.binance.com:9443/stream` for real-time prices

---

## Environment Variables
```env
CMC_API_KEY=f965a35bc24341659b521f1baed8cc94
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEXT_PUBLIC_PAPER_BALANCE=10000
```

---

## Key Files Reference
- **Redux Store**: `src/store/index.ts` (slices: market, portfolio, signals, trading, settings)
- **WebSocket Service**: `src/services/binance.ts`
- **Technical Analysis**: `src/utils/technicalAnalysis.ts` (RSI, MACD, Bollinger Bands)

---

## Notes
- Paper trading mode: $10,000 virtual balance
- AI analysis requires ANTHROPIC_API_KEY
- CMC free tier: 300 requests/day
- Binance WebSocket: unlimited & free
- Always use human oversight for trading decisions
