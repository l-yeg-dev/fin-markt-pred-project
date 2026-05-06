<template>
  <div class="main-chart-container">
    <div class="chart-header">
      <div class="chart-title">
        <h2>{{ symbol }} Live Chart</h2>
        <span class="chart-subtitle">4-Hour History (1m Candles)</span>
      </div>
      <div class="chart-actions">
        <div class="line-toggles">
          <label class="toggle-item">
            <input type="checkbox" v-model="visibleLines.actual" @change="updateVisibility">
            <span class="toggle-label" style="color: #3b82f6">Actual</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="visibleLines.backtest" @change="updateVisibility">
            <span class="toggle-label" style="color: #f59e0b">Back-test</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="visibleLines.live" @change="updateVisibility">
            <span class="toggle-label" style="color: #10b981">Live Prediction</span>
          </label>
        </div>
        <select v-model="symbol" class="symbol-selector" @change="loadChartData">
          <option value="BTCUSDT">Bitcoin (BTC)</option>
          <option value="ETHUSDT">Ethereum (ETH)</option>
          <option value="SOLUSDT">Solana (SOL)</option>
          <option value="BNBUSDT">Binance Coin (BNB)</option>
        </select>
        <button class="predict-btn" @click="fetchPrediction" :disabled="isPredicting">
          <svg v-if="!isPredicting" class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <div v-else class="mini-loader"></div>
          {{ isPredicting ? 'Analyzing...' : 'Show AI Prediction' }}
        </button>
      </div>
    </div>
    
    <div class="chart-wrapper" ref="chartContainer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createChart } from 'lightweight-charts';
import { io } from 'socket.io-client';

const chartContainer = ref(null);
const symbol = ref('BTCUSDT');
const isPredicting = ref(false);

let chart = null;
let actualSeries = null;
let predictionSeries = null;
let actualPredictionSeries = null;
let predictionLine = null;
let socket = null;
let latestPoint = null;

const visibleLines = ref({
  actual: true,
  backtest: true,
  live: true
});

onMounted(() => {
  initChart();
  loadChartData();
  setupSocket();
  
  // Handle resize
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (chart) {
    chart.remove();
  }
  if (socket) {
    socket.disconnect();
  }
});

function handleResize() {
  if (chart && chartContainer.value) {
    chart.applyOptions({ width: chartContainer.value.clientWidth });
  }
}

function initChart() {
  if (!chartContainer.value) return;

  try {
    chart = createChart(chartContainer.value, {
      autoSize: true,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
    });

    // Actual Data Series (Blue)
    actualSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 3,
      title: 'Actual Price',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    // AI Prediction Series (Yellow)
    predictionSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: 0, // Solid
      title: 'AI Back-test',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    // Live Prediction Series (Green)
    actualPredictionSeries = chart.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 2, // Dashed for predictions
      title: 'Live Prediction',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

  } catch (error) {
    console.error('Error initializing chart:', error);
  }
}

async function loadChartData() {
  try {
    // Clear future prediction line if exists
    if (predictionLine) {
      actualSeries.removePriceLine(predictionLine);
      predictionLine = null;
    }

    const res = await fetch(`http://localhost:3001/api/chart/${symbol.value}`);
    if (!res.ok) throw new Error('Failed to load chart data');
    const json = await res.json();
    
    // Map candlestick data to line data (just close price)
    const lineData = json.data.map(d => ({ time: d.time, value: d.close }));
    actualSeries.setData(lineData);
    
    // Set prediction backtest data
    const backtestData = json.predictions.filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);
    predictionSeries.setData(backtestData);
    
    // Set actual future prediction data (Green)
    const livePredictions = json.actualPredictions.filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);
    actualPredictionSeries.setData(livePredictions);
    
    if (lineData.length > 0) {
      latestPoint = { ...lineData[lineData.length - 1] };
    }

    // Adjust time scale to show 1 hour into the future
    const now = Math.floor(Date.now() / 1000);
    chart.timeScale().setVisibleRange({
      from: now - (4 * 3600), // 4 hours ago
      to: now + 3600 // 1 hour future
    });

  } catch (err) {
    console.error(err);
  }
}

function setupSocket() {
  socket = io('http://localhost:3001');
  
  socket.on('crypto-update', (data) => {
    const coinData = data[symbol.value];
    if (coinData && latestPoint) {
      const currentPrice = coinData.price;
      const currentTime = Math.floor(Date.now() / 60000) * 60; // Current minute in seconds

      if (latestPoint.time === currentTime) {
        latestPoint.value = currentPrice;
      } else {
        latestPoint = {
          time: currentTime,
          value: currentPrice
        };
      }
      
      actualSeries.update(latestPoint);
    }
  });
}

async function fetchPrediction() {
  if (isPredicting.value) return;
  
  isPredicting.value = true;
  try {
    const res = await fetch(`http://localhost:3001/api/predict/${symbol.value}`);
    if (!res.ok) throw new Error('Prediction failed');
    const json = await res.json();
    
    // Draw horizontal line for future prediction
    if (predictionLine) {
      actualSeries.removePriceLine(predictionLine);
    }
    
    predictionLine = actualSeries.createPriceLine({
      price: json.predictedPrice,
      color: '#f59e0b', // match yellow theme
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'AI Forecast',
    });
  } catch (err) {
    console.error(err);
    alert('Failed to get AI prediction.');
  } finally {
    isPredicting.value = false;
  }
}

function updateVisibility() {
  if (actualSeries) actualSeries.applyOptions({ visible: visibleLines.value.actual });
  if (predictionSeries) predictionSeries.applyOptions({ visible: visibleLines.value.backtest });
  if (actualPredictionSeries) actualPredictionSeries.applyOptions({ visible: visibleLines.value.live });
}
</script>

<style scoped>
.main-chart-container {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-title h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.chart-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.chart-actions {
  display: flex;
  gap: 20px;
  align-items: center;
}

.line-toggles {
  display: flex;
  gap: 16px;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
}

.toggle-item input {
  cursor: pointer;
}

.toggle-label {
  user-select: none;
}

.symbol-selector {
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
  cursor: pointer;
  outline: none;
}

.symbol-selector:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

.symbol-selector option {
  background: #0f172a;
}

.predict-btn {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.predict-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.4));
  border-color: rgba(139, 92, 246, 0.6);
  color: #ffffff;
}

.predict-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ai-icon {
  width: 18px;
  height: 18px;
}

.mini-loader {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-top: 2px solid #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.chart-wrapper {
  width: 100%;
  height: 400px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
