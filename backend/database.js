const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'crypto_data.db');
const db = new sqlite3.Database(dbPath);

// Initialize the database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      price REAL NOT NULL,
      changePercent REAL NOT NULL,
      volume REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create an index on symbol and timestamp for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_symbol_time ON price_history(symbol, timestamp)`);
});

/**
 * Save a batch of current prices to the database
 * @param {Object} pricesObj - The latestPrices object containing symbol data
 */
function savePrices(pricesObj) {
  const stmt = db.prepare(`
    INSERT INTO price_history (symbol, price, changePercent, volume)
    VALUES (?, ?, ?, ?)
  `);

  Object.values(pricesObj).forEach(data => {
    stmt.run(data.symbol, data.price, data.changePercent, data.volume, (err) => {
      if (err) {
        console.error('Error saving price to DB:', err.message);
      }
    });
  });

  stmt.finalize();
}

/**
 * Fetch the latest N records for a given symbol from our local database
 * @param {string} symbol 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
function getLocalHistory(symbol, limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM price_history WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?`,
      [symbol, limit],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.reverse()); // Return in chronological order
        }
      }
    );
  });
}

module.exports = {
  db,
  savePrices,
  getLocalHistory
};
