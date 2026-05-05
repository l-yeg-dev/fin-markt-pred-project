const tf = require('@tensorflow/tfjs');

/**
 * Fetch 24h historical data from Binance for training
 * @param {string} symbol 
 * @returns {Promise<Array<number>>} Array of closing prices
 */
async function fetchHistoricalData(symbol) {
  // Using 1-hour intervals, last 24 hours
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`;
  let response;
  if (global.fetch) {
    response = await global.fetch(url);
  } else {
    const fetchModule = await import('node-fetch');
    response = await fetchModule.default(url);
  }
  
  if (!response.ok) {
    throw new Error('Failed to fetch historical data');
  }
  
  const data = await response.json();
  // Map to closing prices (index 4 in the kline array)
  return data.map(candle => parseFloat(candle[4]));
}

/**
 * Prepares sequence data for time-series forecasting
 * @param {Array<number>} data 
 * @param {number} windowSize 
 */
function prepareData(data, windowSize) {
  const X = [];
  const y = [];
  
  for (let i = 0; i < data.length - windowSize; i++) {
    X.push(data.slice(i, i + windowSize));
    y.push(data[i + windowSize]);
  }
  
  return { X, y };
}

/**
 * Predicts the next price and calculates an accuracy score based on the last hour
 * @param {string} symbol 
 * @returns {Promise<{predictedPrice: number, accuracy: number}>} The predicted price and accuracy score (0-100)
 */
async function predictNextPrice(symbol) {
  try {
    // Fetch 25 historical points (24 for training, 1 for back-testing)
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=25`;
    let response;
    if (global.fetch) {
      response = await global.fetch(url);
    } else {
      const fetchModule = await import('node-fetch');
      response = await fetchModule.default(url);
    }
    if (!response.ok) throw new Error('Failed to fetch historical data');
    const rawData = await response.json();
    const prices = rawData.map(candle => parseFloat(candle[4]));
    
    if (prices.length < 10) {
      throw new Error("Not enough data to train");
    }

    // --- Part 1: Calculate Accuracy (Back-test on the most recent hour) ---
    // We train on [0...N-2] to predict [N-1]
    const trainingDataForAccuracy = prices.slice(0, prices.length - 1);
    const actualLastPrice = prices[prices.length - 1];
    
    const accuracyResult = await trainAndPredict(trainingDataForAccuracy);
    const accuracy = Math.max(0, 100 - (Math.abs(accuracyResult - actualLastPrice) / actualLastPrice * 100));

    // --- Part 2: Predict Future (Predict the next hour) ---
    // We train on [0...N-1] to predict [N]
    const futurePrediction = await trainAndPredict(prices);

    return { 
      predictedPrice: futurePrediction, 
      accuracy: parseFloat(accuracy.toFixed(2)),
      backtest: {
        predicted: accuracyResult,
        actual: actualLastPrice,
        error: Math.abs(accuracyResult - actualLastPrice),
        errorPercent: (Math.abs(accuracyResult - actualLastPrice) / actualLastPrice * 100).toFixed(2)
      }
    };
  } catch (error) {
    console.error(`Error predicting price for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Core training and prediction logic
 * @param {Array<number>} prices 
 * @returns {Promise<number>}
 */
async function trainAndPredict(prices) {
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  
  if (maxPrice === minPrice) return prices[prices.length - 1];
  
  const normalizedPrices = prices.map(p => (p - minPrice) / (maxPrice - minPrice));
  const windowSize = 3;
  const { X, y } = prepareData(normalizedPrices, windowSize);

  const xs = tf.tensor2d(X, [X.length, windowSize]);
  const ys = tf.tensor2d(y, [y.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 8, inputShape: [windowSize], activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));

  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  await model.fit(xs, ys, { epochs: 50, verbose: 0 });

  const lastWindow = normalizedPrices.slice(-windowSize);
  const input = tf.tensor2d([lastWindow], [1, windowSize]);
  
  const predictionTensor = model.predict(input);
  const normalizedPrediction = predictionTensor.dataSync()[0];
  const predictedPrice = normalizedPrediction * (maxPrice - minPrice) + minPrice;
  
  xs.dispose();
  ys.dispose();
  input.dispose();
  predictionTensor.dispose();
  model.dispose();

  return predictedPrice;
}

/**
 * Generates a series of predictions for historical data points
 * @param {Array<number>} prices 
 * @param {number} windowSize 
 * @returns {Promise<Array<number | null>>}
 */
async function generateBacktestSeries(prices, windowSize = 3) {
  // Train once on the whole sequence to get the "trained" model
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  if (maxPrice === minPrice) return prices.map(() => prices[prices.length - 1]);

  const normalizedPrices = prices.map(p => (p - minPrice) / (maxPrice - minPrice));
  const { X, y } = prepareData(normalizedPrices, windowSize);

  const xs = tf.tensor2d(X, [X.length, windowSize]);
  const ys = tf.tensor2d(y, [y.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 8, inputShape: [windowSize], activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  await model.fit(xs, ys, { epochs: 50, verbose: 0 });

  // Now generate predictions for every window
  const predictions = new Array(prices.length).fill(null);
  
  for (let i = windowSize; i < prices.length; i++) {
    const window = normalizedPrices.slice(i - windowSize, i);
    const input = tf.tensor2d([window], [1, windowSize]);
    const predTensor = model.predict(input);
    const normalizedPred = predTensor.dataSync()[0];
    predictions[i] = normalizedPred * (maxPrice - minPrice) + minPrice;
    
    input.dispose();
    predTensor.dispose();
  }

  xs.dispose();
  ys.dispose();
  model.dispose();

  return predictions;
}

module.exports = {
  fetchHistoricalData,
  predictNextPrice,
  generateBacktestSeries
};
