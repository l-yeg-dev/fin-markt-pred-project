<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div class="header-content">
        <h1>Pulse<span class="highlight">Crypto</span></h1>
        <div class="status-indicator">
          <span class="status-dot" :class="{ 'connected': isConnected }"></span>
          <span class="status-text">{{ isConnected ? 'Live' : 'Connecting...' }}</span>
        </div>
      </div>
      <p class="subtitle">Real-time cryptocurrency market data</p>
    </header>

    <main class="dashboard-main">
      <MainChart />
      
      <div v-if="!isConnected && Object.keys(cryptoData).length === 0" class="loading-state">
        <div class="loader"></div>
        <p>Connecting to data stream...</p>
      </div>

      <div v-else>
        <div class="legend-section">
          <div class="legend-group">
            <span class="legend-label">AI Confidence:</span>
            <div class="legend-item">
              <span class="dot accuracy-high"></span> High (>95%)
            </div>
            <div class="legend-item">
              <span class="dot accuracy-medium"></span> Medium (90-95%)
            </div>
            <div class="legend-item">
              <span class="dot accuracy-low"></span> Low (<90%)
            </div>
          </div>
          <div class="legend-divider"></div>
          <div class="legend-group">
            <span class="legend-label">Price Trend:</span>
            <div class="legend-item">
              <span class="trend-up">▲</span> Forecasted Up
            </div>
            <div class="legend-item">
              <span class="trend-down">▼</span> Forecasted Down
            </div>
          </div>
        </div>

        <div class="crypto-grid">
          <CryptoCard 
            v-for="symbol in sortedSymbols" 
            :key="symbol" 
            :data="cryptoData[symbol]" 
          />
        </div>
      </div>
    </main>
    
    <footer class="dashboard-footer">
      <p>Data provided by Binance Public API</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { io } from 'socket.io-client';
import CryptoCard from './components/CryptoCard.vue';
import MainChart from './components/MainChart.vue';

const isConnected = ref(false);
const cryptoData = ref({});
let socket = null;

// The preferred order of symbols if available
const PREFERRED_ORDER = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];

const sortedSymbols = computed(() => {
  const availableSymbols = Object.keys(cryptoData.value);
  return availableSymbols.sort((a, b) => {
    let indexA = PREFERRED_ORDER.indexOf(a);
    let indexB = PREFERRED_ORDER.indexOf(b);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  });
});

onMounted(() => {
  // Connect to the Node.js backend (default port 3001)
  socket = io('http://localhost:3001');

  socket.on('connect', () => {
    isConnected.value = true;
  });

  socket.on('disconnect', () => {
    isConnected.value = false;
  });

  socket.on('crypto-update', (data) => {
    // Merge new data with existing
    cryptoData.value = { ...cryptoData.value, ...data };
  });
});

onUnmounted(() => {
  if (socket) {
    socket.disconnect();
  }
});
</script>

<style>
/* Global Styles imported in main.js, but adding some layout specifics here */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --bg-color: #0f172a;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --accent-color: #3b82f6;
  --accuracy-high: #10b981;
  --accuracy-medium: #f59e0b;
  --accuracy-low: #ef4444;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-color);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.08), transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.08), transparent 25%);
  background-attachment: fixed;
  min-height: 100vh;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  margin-bottom: 48px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -1px;
}

.highlight {
  color: var(--accent-color);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ef4444; /* red when disconnected */
  box-shadow: 0 0 10px #ef4444;
  transition: all 0.3s ease;
}

.status-dot.connected {
  background-color: #10b981; /* green when connected */
  box-shadow: 0 0 10px #10b981;
}

.status-text {
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.dashboard-main {
  flex-grow: 1;
}

/* Legend Section Styles */
.legend-section {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-bottom: 32px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  width: fit-content;
}

.legend-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.legend-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.accuracy-high { background-color: var(--accuracy-high); box-shadow: 0 0 8px var(--accuracy-high); }
.accuracy-medium { background-color: var(--accuracy-medium); box-shadow: 0 0 8px var(--accuracy-medium); }
.accuracy-low { background-color: var(--accuracy-low); box-shadow: 0 0 8px var(--accuracy-low); }

.trend-up { color: #10b981; font-weight: 700; }
.trend-down { color: #ef4444; font-weight: 700; }

.crypto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 40vh;
  color: var(--text-secondary);
  gap: 20px;
}

.loader {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.dashboard-footer {
  margin-top: 64px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 24px;
}

@media (max-width: 1024px) {
  .legend-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .legend-divider {
    display: none;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .crypto-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}
</style>
