# CryptoMind - AI-Powered Crypto Trading Application

## Project Overview

**CryptoMind** adalah aplikasi trading crypto berbasis AI yang membantu pengguna menganalisis market, melihat tren berdasarkan timeframe, mendapatkan informasi dari berbagai sumber untuk keputusan buy/sell, dan melakukan auto trading dengan paper trading.

## Technology Stack

| Komponen | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| State Management | Redux Toolkit + Redux Saga |
| Styling | Tailwind CSS |
| Charts | TradingView Lightweight Charts |
| AI Analysis | Claude Sonnet 4.6 (Anthropic) |
| Market Data | CoinMarketCap API |
| Real-time | Binance WebSocket |

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
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── dashboard/
│   │   │   ├── PortfolioCard.tsx
│   │   │   └── AISignalCard.tsx
│   │   ├── chart/
│   │   │   └── PriceChart.tsx
│   │   ├── trading/
│   │   │   ├── OrderForm.tsx
│   │   │   └── PositionsList.tsx
│   │   └── ReduxProvider.tsx
│   │
│   ├── store/
│   │   ├── index.ts                 → Redux store config
│   │   ├── hooks.ts                → Typed hooks
│   │   └── slices/
│   │       ├── marketSlice.ts
│   │       ├── portfolioSlice.ts
│   │       ├── signalSlice.ts
│   │       ├── tradingSlice.ts
│   │       └── settingsSlice.ts
│   │
│   ├── sagas/
│   │   ├── rootSaga.ts
│   │   ├── marketSaga.ts
│   │   ├── tradingSaga.ts
│   │   └── signalSaga.ts
│   │
│   ├── services/
│   │   ├── coinMarketCap.ts
│   │   ├── binance.ts              → Includes WebSocket
│   │   └── claude.ts
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── formatters.ts
│   │   └── technicalAnalysis.ts
│   │
│   └── types/
│       └── index.ts
│
├── .env.local                      → API Keys (secret)
├── .env.example                    → Template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

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

## Running the Application

```bash
# Development
npm run dev

# Production build
npm run build

# Production server
npm run start
```

App akan running di `http://localhost:3000`

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

## Future Enhancements

1. **Multiple AI Models**: GPT-5, Gemini 2.5 Pro
2. **On-chain Data**: Glassnode, Nansen integration
3. **News Sentiment**: CryptoPanic, Reddit integration
4. **Real Trading**: Binance API integration untuk live trading
5. **Backtesting**: Historical strategy testing
6. **Portfolio Analytics**: Risk management, position sizing

## Notes

- Paper trading mode: $10,000 virtual balance
- AI analysis requires ANTHROPIC_API_KEY
- CMC free tier: 300 requests/day
- Binance WebSocket: unlimited & free
- Always use human oversight untuk trading decisions

---

## Feature: AI Price Targets (Entry, Stop Loss, Take Profit)

### Overview
Ditambahkan fitur price targets pada signal AI yang mencakup:
- **Entry Price**: Harga masuk yang disarankan
- **Stop Loss**: Harga untuk cut loss
- **Take Profit**: Harga untuk take profit
- **Risk/Reward Ratio**: Rasio risk vs reward

### Implementation

#### 1. TypeScript Interface Update
```typescript
// src/types/index.ts
export interface Signal {
  // ... existing fields
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
}
```

#### 2. AI Prompt Update
```typescript
// src/services/claude.ts
const SYSTEM_PROMPT = `...
Provide your analysis in JSON format:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": number (0-100),
  "entryPrice": number,
  "stopLoss": number,
  "takeProfit": number,
  "riskRewardRatio": number,
  "reasoning": "string",
  "keyFactors": ["string"],
  "riskLevel": "low" | "medium" | "high"
}`;
```

#### 3. Fallback Calculation (Tanpa AI)
Jika AI tidak provide price targets, menggunakan Bollinger Bands:
```typescript
if (type === 'BUY') {
  entryPrice = currentPrice;
  stopLoss = bollingerBands.lower * 0.98;  // 2% below lower BB
  takeProfit = bollingerBands.upper * 1.02; // 2% above upper BB
}
```

#### 4. UI Components Update
- `AISignalCard.tsx`: Display price targets dengan format yang jelas
- `SignalsPage.tsx`: Price targets di signal generation
- `HistoryPage.tsx`: Price targets di signal history

### Contoh Output Signal dengan Price Targets:
```json
{
  "signal": "BUY",
  "confidence": 78,
  "entryPrice": 67500,
  "stopLoss": 66500,
  "takeProfit": 70000,
  "riskRewardRatio": 2.5,
  "reasoning": "Multiple bullish factors align...",
  "keyFactors": ["MACD crossover", "RSI oversold"]
}
```

### UI Display
```
┌─────────────────────────────────────┐
│  🔷 BUY                              │
│  Confidence: 78%                    │
│                                     │
│  Price Targets:                     │
│  ┌────────────┬────────────┐       │
│  │ Entry      │ $67,500    │       │
│  │ Stop Loss  │ $66,500    │       │
│  │ Take Profit│ $70,000    │       │
│  │ R:R        │ 1:2.5      │       │
│  └────────────┴────────────┘       │
└─────────────────────────────────────┘
```
