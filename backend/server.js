const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import Phase 2 modules
const dbModule = require('./database');
const predictor = require('./predictor');
const gemini = require('./gemini_analyst');

const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing

const server = http.createServer(app);

// Initialize Socket.IO with CORS enabled for the Vue frontend
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const SYMBOLS_TO_TRACK = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
let latestPrices = {};

// We use Binance REST API to avoid WebSocket blocks
const BINANCE_API_URL = 'https://api.binance.com/api/v3/ticker/24hr';

async function fetchCryptoData() {
  try {
    let response;
    if (global.fetch) {
      response = await global.fetch(BINANCE_API_URL);
    } else {
      const fetchModule = await import('node-fetch');
      response = await fetchModule.default(BINANCE_API_URL);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    let updated = false;

    if (Array.isArray(json)) {
      json.forEach(coin => {
        if (SYMBOLS_TO_TRACK.includes(coin.symbol)) {
          latestPrices[coin.symbol] = {
            symbol: coin.symbol,
            price: parseFloat(coin.lastPrice),
            changePercent: parseFloat(coin.priceChangePercent),
            volume: parseFloat(coin.volume)
          };
          updated = true;
        }
      });
    }

    if (updated) {
      // Broadcast real-time updates
      io.emit('crypto-update', latestPrices);
      
      // Save snapshot to SQLite database
      dbModule.savePrices(latestPrices);
    }
  } catch (error) {
    console.error('Error fetching data from Binance REST API:', error.message);
  }
}

// Poll every 3 seconds
setInterval(fetchCryptoData, 3000);
// Initial fetch
fetchCryptoData();

// --- REST Endpoints for Phase 2 ---

// Endpoint to get the last 24h of history
app.get('/api/history/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await predictor.fetchHistoricalData(symbol);
    res.json({ symbol, history: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Endpoint to run TensorFlow.js prediction
app.get('/api/predict/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const { predictedPrice, accuracy, backtest } = await predictor.predictNextPrice(symbol);
    res.json({ symbol, predictedPrice, accuracy, backtest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Gemini Market Analysis
app.get('/api/analyze/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    // Get 24h history for context
    const prices = await predictor.fetchHistoricalData(symbol);
    const currentPrice = prices[prices.length - 1];
    
    const analysis = await gemini.analyzeMarket(symbol, prices, currentPrice);
    res.json({ symbol, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch 4-hour historical klines for charting
app.get('/api/chart/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  // 1-minute interval, 240 limit = 4 hours
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=240`;
  try {
    let response;
    if (global.fetch) {
      response = await global.fetch(url);
    } else {
      const fetchModule = await import('node-fetch');
      response = await fetchModule.default(url);
    }
    if (!response.ok) throw new Error('Failed to fetch from Binance');
    
    const data = await response.json();
    // Map to Lightweight Charts format
    const formattedData = data.map(candle => ({
      time: Math.floor(candle[0] / 1000), // convert ms to seconds
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4])
    }));

    // Generate backtest predictions for these prices
    const prices = formattedData.map(d => d.close);
    const predictions = await predictor.generateBacktestSeries(prices);
    
    const predictionData = formattedData.map((d, i) => ({
      time: d.time,
      value: predictions[i]
    })).filter(p => p.value !== null);
    
    res.json({ symbol, data: formattedData, predictions: predictionData });
  } catch (error) {
    console.error('Chart Error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Handle client connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send immediate initial state
  socket.emit('crypto-update', latestPrices);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT} (Binance REST API + SQLite + TFJS)`);
});
