const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

// Initialize the new Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

/**
 * Analyzes market data using the latest Gemini 3 model
 * @param {string} symbol 
 * @param {Array<number>} prices 
 * @param {number} currentPrice 
 * @returns {Promise<string>}
 */
async function analyzeMarket(symbol, prices, currentPrice) {
  try {
    const prompt = `
      Act as a professional cryptocurrency quantitative analyst.
      Analyze the following 24-hour price history for ${symbol}.
      
      Current Price: $${currentPrice}
      Price Sequence (Last 24h): ${prices.join(', ')}
      
      Provide a concise 3-sentence market insight. 
      1. Identify the current trend.
      2. Mention a key support or resistance level.
      3. Give a professional rationale for the likely next move.
      Keep it brief and data-driven.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini 3 Analysis Error:", error);
    return "Market analysis temporarily unavailable. Please check your Gemini API key configuration.";
  }
}

module.exports = { analyzeMarket };
