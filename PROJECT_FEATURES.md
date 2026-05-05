# PulseCrypto AI Dashboard - Project Summary

PulseCrypto is a full-stack, professional cryptocurrency intelligence dashboard that combines real-time market data with machine learning predictions and AI-driven market analysis.

## 🚀 Core Technology Stack

- **Frontend**: Vue 3 (Composition API), Lightweight Charts (by TradingView), Socket.io-client, Vanilla CSS (Glassmorphism, Dark Mode).
- **Backend**: Node.js, Express, Socket.io, TensorFlow.js (Machine Learning), Google Generative AI (Gemini 3 Flash).
- **Database**: SQLite3 for historical price persistence.
- **API Source**: Binance Public REST API.

---

## ✨ Key Features

### 1. Real-time Market Data Stream
- **Live Updates**: High-frequency price updates for major pairs (BTC, ETH, SOL, BNB, XRP, DOGE, ADA, DOT, LINK).
- **WebSocket Synchronization**: Backend polls Binance and broadcasts delta-updates to all connected clients every 3 seconds via Socket.io.
- **Persistence**: Every snapshot is automatically logged to an SQLite database for historical trend analysis.

### 2. Interactive AI-Powered Visualizations
- **Dual-Line Performance Chart**: 
    - **Blue Line**: Actual historical closing prices (last 4 hours, 1-minute intervals).
    - **Yellow Line**: AI Back-test overlay, showing how the model would have predicted prices at those specific timestamps.
- **Dynamic Chart Updates**: The chart updates in real-time as new price points arrive, maintaining a seamless live view.
- **Lightweight & Fast**: Built with TradingView's high-performance charting library.

### 3. TensorFlow.js Prediction Engine
- **Time-Series Forecasting**: Uses a sliding-window neural network (window size: 3) to predict the next hour's price.
- **AI Accuracy Scoring**: Automatically calculates a confidence score (0-100%) by back-testing the model against the most recent actual price point.
- **Visual Forecasts**: One-click prediction renders a dashed "AI Forecast" line on the chart.

### 4. Gemini 3 Expert Market Rationale
- **Expert Insight**: Integrates `gemini-3-flash-preview` to act as a professional quantitative analyst.
- **Contextual Analysis**: Sends 24 hours of historical price data to Gemini to generate:
    1. Trend identification.
    2. Support/Resistance level detection.
    3. Professional rationale for likely next moves.
- **Brief & Actionable**: Insights are delivered in a concise, 3-sentence format directly in the UI.

### 5. Premium UI/UX Design
- **Modern Aesthetics**: Sleek dark mode with radial gradients, Inter typography, and glassmorphic components.
- **AI Confidence Indicators**: Visual "traffic light" system (Green/Yellow/Red) for AI accuracy levels.
- **Responsive Layout**: Fully adaptive grid design for desktop, tablet, and mobile viewing.
- **Connectivity Status**: Real-time indicator showing WebSocket connection health.

---

## 🛠️ Project Structure

```text
realtime-dashboard/
├── backend/
│   ├── server.js          # Express & Socket.io entry point
│   ├── predictor.js       # TFJS model and prediction logic
│   ├── gemini_analyst.js  # Google Gemini 3 API integration
│   ├── database.js        # SQLite persistence layer
│   └── crypto_data.db     # SQLite database file
└── frontend/
    ├── src/
    │   ├── App.vue        # Dashboard layout & state management
    │   └── components/
    │       ├── MainChart.vue   # Lightweight Charts implementation
    │       └── CryptoCard.vue  # Real-time metrics & AI summary
    └── vite.config.js     # Frontend build configuration
```

---

## 🎯 Implementation Rationale
The project was designed to demonstrate the bridge between raw financial data and actionable intelligence. By combining **local ML (TensorFlow.js)** for rapid mathematical forecasting and **Global LLM (Gemini 3)** for qualitative reasoning, PulseCrypto provides a multi-dimensional view of the market that typical dashboards lack.
