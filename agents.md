# CryptoMind - AI-Powered Crypto Trading Application

## Project Overview

**CryptoMind** adalah aplikasi trading crypto berbasis AI yang membantu pengguna menganalisis market, melihat tren berdasarkan timeframe, mendapatkan informasi dari berbagai sumber untuk keputusan buy/sell, dan melakukan auto trading dengan paper trading.

## Technology Stack

| Komponen | Technology |
|----------|------------|
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

### Development
```bash
npm run dev        # Start development server on http://localhost:3000
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Testing
This project does **not** have a test framework configured. If adding tests:
- Use Vitest or Jest with React Testing Library
- Run single test: `npm test -- --testPathPattern="filename"`
- Or with Vitest: `npx vitest run filename.spec.ts`

---

## Project Structure

```
crypto-market/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── market/route.ts      → CMC API proxy
│   │   │   ├── candles/route.ts     → Binance API proxy
│   │   │   └── analyze/route.ts     → Claude AI proxy
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── layout/           # Header, Sidebar, Layout
│   │   ├── dashboard/         # PortfolioCard, AISignalCard
│   │   ├── chart/            # PriceChart
│   │   └── trading/          # OrderForm, PositionsList
│   │
│   ├── store/                # Redux Toolkit
│   │   ├── slices/          # Redux slices
│   │   ├── hooks.ts         # Typed hooks
│   │   └── index.ts         # Store config
│   │
│   ├── sagas/               # Redux Saga
│   ├── services/            # API services
│   ├── utils/               # Utilities
│   └── types/               # TypeScript types
│
├── .env.local               → API Keys (secret)
├── .env.example             → Template
├── package.json
└── tsconfig.json
```

---

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** in `tsconfig.json`
- Always use explicit types for function parameters and return values
- Use `type` for unions/aliases, `interface` for object shapes
- Use path alias `@/*` for imports (configured in tsconfig)

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

// Relative imports when in same directory
import { formatPrice } from './formatters';
```

### Components
- Use function components with explicit return types
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
| React Props | camelCase | `className`, `onClick` |
| Files | kebab-case | `market-slice.ts` |

### Error Handling
- Always use try/catch for async operations
- Provide fallback error messages
- Handle errors in Redux with `setError` action

```typescript
// Good
try {
  const data = await fetchApi();
  return data;
} catch (error: any) {
  console.error('Error fetching data:', error);
  throw new Error(error.message || 'Failed to fetch data');
}

// API Routes
try {
  const response = await fetch(url);
  if (!response.ok) {
    return NextResponse.json({ error: 'Failed' }, { status: response.status });
  }
  return NextResponse.json(await response.json());
} catch (error: any) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

### Tailwind CSS v4
- Uses `@theme` directive for custom colors in `globals.css`
- Use CSS variables for theme colors

```css
/* globals.css */
@theme {
  --color-bg-primary: #0a0a0f;
  --color-accent-green: #00d26a;
}

/* Component */
<div className="bg-bg-primary text-accent-green">...</div>
```

### Dark Theme Colors Reference
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

## Key Features

### 1. Market Data (Real-time)
- CoinMarketCap API untuk harga dan market cap
- Binance WebSocket untuk update harga real-time
- Top gainers/losers
- Watchlist

### 2. Technical Analysis
- **RSI** (Relative Strength Index)
- **MACD** (Moving Average Convergence Divergence)
- **Bollinger Bands**
- **Moving Averages** (SMA 20, 50, 200)
- **Trend Detection**
- Multiple timeframes: 1H, 4H, 1D, 1W

### 3. AI Analysis
- Claude Sonnet 4.6 untuk analisis market
- Signal generation: BUY/SELL/HOLD
- Confidence scoring
- Technical + Fundamental analysis

### 4. Paper Trading
- Virtual balance: $10,000 USDT
- Market & Limit orders
- Position management
- P&L tracking
- Trade history

### 5. UI/UX
- Dark theme
- Responsive design
- Real-time chart updates
- Signal cards dengan confidence

---

## API Integration

### CoinMarketCap API
```
GET /api/market
```
- Endpoint proxy untuk menghindari CORS
- Returns: top 50 cryptocurrencies

### Binance API
```
GET /api/candles?symbol=BTC&timeframe=1h
WebSocket: wss://stream.binance.com:9443/stream
```
- Candlestick data untuk chart
- Real-time ticker via WebSocket

### Claude AI API
```
POST /api/analyze
```
- AI-powered market analysis
- Signal generation dengan confidence

---

## Environment Variables

```env
# CoinMarketCap (Wajib)
CMC_API_KEY=f965a35bc24341659b521f1baed8cc94

# Anthropic Claude (Optional - untuk AI analysis)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Binance (Optional - untuk real trading)
BINANCE_API_KEY=
BINANCE_SECRET_KEY=

# Settings
NEXT_PUBLIC_APP_NAME=CryptoMind
NEXT_PUBLIC_PAPER_BALANCE=10000
```

---

## Running the Application

```bash
# Development
npm run dev

# Production build
npm run build

# Production server
npm run start

# Lint
npm run lint
```

App akan running di `http://localhost:3000`

---

## Key Files Reference

### Redux Store (`src/store/index.ts`)
```typescript
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import marketReducer from './slices/marketSlice';
import portfolioReducer from './slices/portfolioSlice';
import signalReducer from './slices/signalSlice';
import tradingReducer from './slices/tradingSlice';
import settingsReducer from './slices/settingsSlice';
import rootSaga from '../sagas/rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    market: marketReducer,
    portfolio: portfolioReducer,
    signals: signalReducer,
    trading: tradingReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### WebSocket Service (`src/services/binance.ts`)
```typescript
class BinanceWebSocket {
  private ws: WebSocket | null = null;
  
  connect(symbols: string[]) {
    const streams = symbols.map(s => `${s.toLowerCase()}usdt@ticker`).join('/');
    this.ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Process ticker data
    };
  }
  
  subscribe(symbol: string, callback: (data: TickerData) => void) {
    // Subscribe to specific symbol updates
  }
}

export const binanceWS = new BinanceWebSocket();
```

### Technical Analysis (`src/utils/technicalAnalysis.ts`)
- `calculateRSI(data, period)`
- `calculateMACD(data, fastPeriod, slowPeriod, signalPeriod)`
- `calculateBollingerBands(data, period, stdDev)`
- `calculateMovingAverages(prices)`
- `detectTrend(candles)`
- `findSupportResistance(candles)`

---

## Known Issues & Solutions

### 1. CORS Error
**Problem**: CoinMarketCap API blocked by CORS policy

**Solution**: Created API routes as proxies:
- `/api/market` → CMC API
- `/api/candles` → Binance API
- `/api/analyze` → Claude API

### 2. Turbopack Issues
**Problem**: Turbopack causing CSS processing errors

**Solution**: Disabled turbopack in Next.js 16 by using standard dev server

### 3. Real-time Updates
**Problem**: Need real-time price updates

**Solution**: Implemented Binance WebSocket connection with auto-reconnect

---

## Future Enhancements

1. **Multiple AI Models**: GPT-5, Gemini 2.5 Pro
2. **On-chain Data**: Glassnode, Nansen integration
3. **News Sentiment**: CryptoPanic, Reddit integration
4. **Real Trading**: Binance API integration untuk live trading
5. **Backtesting**: Historical strategy testing
6. **Portfolio Analytics**: Risk management, position sizing

---

## Notes

- Paper trading mode: $10,000 virtual balance
- AI analysis requires ANTHROPIC_API_KEY
- CMC free tier: 300 requests/day
- Binance WebSocket: unlimited & free
- Always use human oversight untuk trading decisions
