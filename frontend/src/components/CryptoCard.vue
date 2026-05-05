<template>
  <div class="crypto-card" :class="flashClass">
    <div class="crypto-header">
      <h2 class="crypto-symbol">{{ formattedSymbol }}</h2>
      <span class="crypto-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </span>
    </div>
    
    <div class="crypto-body">
      <div class="price-container">
        <span class="currency-symbol">$</span>
        <span class="price">{{ formattedPrice }}</span>
      </div>
      
      <div class="change-container" :class="changeClass">
        <svg v-if="data.changePercent >= 0" class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
        <svg v-else class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
          <polyline points="17 18 23 18 23 12"></polyline>
        </svg>
        <span class="change-percent">{{ Math.abs(data.changePercent).toFixed(2) }}%</span>
      </div>
    </div>

    <div class="ai-prediction-section">
      <button v-if="!prediction && !isPredicting" class="predict-btn" @click="fetchPrediction">
        <svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI Predict Next Hour
      </button>
      
      <div v-else-if="isPredicting" class="predicting-state">
        <div class="mini-loader"></div>
        <span>AI is analyzing...</span>
      </div>
      
      <div v-else class="prediction-result" :class="predictionTrend">
        <div class="prediction-main">
          <span class="prediction-label">Next Hour Forecast:</span>
          <span class="prediction-value">${{ formatValue(prediction) }}</span>
        </div>
        <div v-if="accuracy" class="accuracy-badge" :class="accuracyClass">
          <span class="accuracy-label">AI Confidence:</span>
          <span class="accuracy-value">{{ accuracy }}%</span>
          
          <!-- Tooltip Table -->
          <div class="metrics-tooltip">
            <h4 class="tooltip-title">Back-test Metrics</h4>
            <table class="metrics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Actual (Last Hour)</td>
                  <td>${{ formatValue(backtestData.actual) }}</td>
                </tr>
                <tr>
                  <td>Predicted (Mock)</td>
                  <td>${{ formatValue(backtestData.predicted) }}</td>
                </tr>
                <tr>
                  <td>Abs. Error</td>
                  <td>${{ formatValue(backtestData.error) }}</td>
                </tr>
                <tr class="highlight-row">
                  <td>MAPE</td>
                  <td>{{ backtestData.errorPercent }}%</td>
                </tr>
              </tbody>
            </table>
            <p class="tooltip-footer">Calculated by back-testing on the most recent 1h candle.</p>
          </div>
        </div>

        <!-- Gemini Analysis Section -->
        <div class="gemini-analysis-section">
          <button v-if="!analysis && !isAnalyzing" class="analyze-btn" @click="fetchAnalysis">
            <svg class="sparkle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707" />
            </svg>
            Get Gemini 3 Insights
          </button>
          
          <div v-else-if="isAnalyzing" class="analyzing-state">
            <div class="mini-loader"></div>
            <span>Gemini is thinking...</span>
          </div>
          
          <div v-else class="analysis-box">
            <div class="analysis-header">
              <span class="gemini-tag">GEMINI 3 FLASH</span>
            </div>
            <p class="analysis-text">{{ analysis }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
});

const flashClass = ref('');
const isPredicting = ref(false);
const prediction = ref(null);
const accuracy = ref(null);
const backtestData = ref(null);

const isAnalyzing = ref(false);
const analysis = ref(null);

// Format the symbol (e.g., BTCUSDT -> BTC)
const formattedSymbol = computed(() => {
  return props.data.symbol.replace('USDT', '');
});

function formatValue(price) {
  if (!price && price !== 0) return '0.00';
  if (price < 1) return price.toFixed(4);
  if (price < 10) return price.toFixed(3);
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format the price based on its magnitude
const formattedPrice = computed(() => {
  return formatValue(props.data.price);
});

// Determine if the 24h change is positive or negative
const changeClass = computed(() => {
  return props.data.changePercent >= 0 ? 'positive' : 'negative';
});

// Accuracy class based on score
const accuracyClass = computed(() => {
  if (!accuracy.value) return '';
  if (accuracy.value >= 95) return 'accuracy-high';
  if (accuracy.value >= 90) return 'accuracy-medium';
  return 'accuracy-low';
});

// Watch for price changes to trigger flash animations
watch(() => props.data.price, (newPrice, oldPrice) => {
  if (newPrice > oldPrice) {
    flashClass.value = 'flash-up';
  } else if (newPrice < oldPrice) {
    flashClass.value = 'flash-down';
  }
  
  // Remove the flash class after the animation completes
  setTimeout(() => {
    flashClass.value = '';
  }, 500);
});

const predictionTrend = computed(() => {
  if (!prediction.value) return '';
  return prediction.value >= props.data.price ? 'pred-up' : 'pred-down';
});

async function fetchPrediction() {
  isPredicting.value = true;
  try {
    const res = await fetch(`http://localhost:3001/api/predict/${props.data.symbol}`);
    if (!res.ok) throw new Error('Prediction failed');
    const json = await res.json();
    prediction.value = json.predictedPrice;
    accuracy.value = json.accuracy;
    backtestData.value = json.backtest;
  } catch (err) {
    console.error(err);
    alert('Failed to get AI prediction.');
  } finally {
    isPredicting.value = false;
  }
}

async function fetchAnalysis() {
  isAnalyzing.value = true;
  try {
    const res = await fetch(`http://localhost:3001/api/analyze/${props.data.symbol}`);
    if (!res.ok) throw new Error('Analysis failed');
    const json = await res.json();
    analysis.value = json.analysis;
  } catch (err) {
    console.error(err);
    alert('Failed to get Gemini analysis.');
  } finally {
    isAnalyzing.value = false;
  }
}
</script>

<style scoped>
/* ... existing styles ... */

.gemini-analysis-section {
  margin-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  padding-top: 12px;
}

.analyze-btn {
  width: 100%;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.analyze-btn:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.4);
  color: #ffffff;
}

.sparkle-icon {
  width: 14px;
  height: 14px;
}

.analyzing-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #a78bfa;
  font-size: 0.8rem;
  padding: 8px 0;
}

.analysis-box {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 8px;
  padding: 12px;
  animation: fadeIn 0.3s ease;
}

.analysis-header {
  margin-bottom: 8px;
}

.gemini-tag {
  font-size: 0.6rem;
  font-weight: 800;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 1px;
}

.analysis-text {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.crypto-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.5s ease;
  overflow: hidden;
  position: relative;
}

.crypto-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Flash Animations for real-time updates */
.flash-up {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
}

.flash-down {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

.crypto-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.crypto-symbol {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.crypto-icon {
  width: 32px;
  height: 32px;
  color: rgba(255, 255, 255, 0.5);
}

.crypto-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-container {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.currency-symbol {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.price {
  font-size: 2.5rem;
  font-weight: 800;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.change-container {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
  width: fit-content;
}

.trend-icon {
  width: 16px;
  height: 16px;
}

.positive {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.negative {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* AI Prediction Section */
.ai-prediction-section {
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 16px;
}

.predict-btn {
  width: 100%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
  padding: 10px;
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

.predict-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.4));
  border-color: rgba(139, 92, 246, 0.6);
  color: #ffffff;
}

.ai-icon {
  width: 18px;
  height: 18px;
}

.predicting-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #c4b5fd;
  font-size: 0.9rem;
  padding: 10px 0;
}

.mini-loader {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-top: 2px solid #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.prediction-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.prediction-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prediction-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prediction-value {
  font-weight: 700;
  font-size: 1.1rem;
}

.accuracy-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  position: relative;
  cursor: help;
}

.metrics-tooltip {
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  z-index: 100;
  visibility: hidden;
  opacity: 0;
  transition: all 0.2s ease;
  pointer-events: none;
}

.accuracy-badge:hover .metrics-tooltip {
  visibility: visible;
  opacity: 1;
  bottom: 140%;
}

.tooltip-title {
  margin: 0 0 12px 0;
  font-size: 0.85rem;
  color: #ffffff;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.metrics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  color: #94a3b8;
}

.metrics-table th {
  text-align: left;
  padding: 4px 0;
  color: #ffffff;
  font-weight: 600;
}

.metrics-table td {
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.metrics-table tr:last-child td {
  border-bottom: none;
}

.highlight-row td {
  color: #ffffff;
  font-weight: 700;
}

.tooltip-footer {
  margin: 12px 0 0 0;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  text-align: center;
  line-height: 1.4;
}

.accuracy-label {
  color: rgba(255, 255, 255, 0.7);
}

.accuracy-high {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.accuracy-medium {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.accuracy-low {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.pred-up .prediction-value {
  color: #10b981;
}

.pred-down .prediction-value {
  color: #ef4444;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
