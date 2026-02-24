const axios = require('axios');

/**
 * Price Manager
 * Handles fetching and caching of token prices for unified bot
 */
class PriceManager {
  constructor(priceApiUrl) {
    this.priceApiUrl = priceApiUrl;
    this.priceCache = {
      data: {},
      lastUpdate: 0,
      cacheDuration: 15 * 60 * 1000 // 5 minutes cache
    };
  }

  async fetchPrices() {
    try {
      const now = Date.now();
      if (now - this.priceCache.lastUpdate < this.priceCache.cacheDuration) {
        console.log('📊 Using cached prices');
        return this.priceCache.data;
      }

      console.log('🔄 Fetching fresh prices from API...');
      const response = await axios.get(this.priceApiUrl, {
        timeout: 10000
      });
      
      if (!response.data || !response.data.success) {
        throw new Error('API response indicates failure');
      }
      
      const prices = {
        'USDT': 1.0, // USDT is always $1.00 (stablecoin)
        'KAIA': 0.0,  // Will be set if available from API
        'KUB': 0.0,   // Will be set if available from API
        'XTZ': 0.0    // Will be set if available from API
      };
      
      const priceData = response.data.data;
      
      for (const item of priceData) {
        const symbol = item.symbol;
        
        // Map API symbols to internal format
        if (symbol === 'MARBLEX') {
          prices['MBX'] = item.price;
        } else if (symbol === 'STAKED_KAIA') {
          prices['STKAIA'] = item.price;  // Map STAKED_KAIA to STKAIA
          prices['stKAIA'] = item.price;  // Also map to lowercase for compatibility
        } else if (symbol === 'KAIA') {
          prices['KAIA'] = item.price;
        } else if (symbol === 'KUB') {
          prices['KUB'] = item.price;
        } else if (symbol === 'XTZ' || symbol === 'TEZOS') {
          prices['XTZ'] = item.price;
        } else if (symbol !== 'USDT') {
          prices[symbol] = item.price;
        }
      }
      
      this.priceCache.data = prices;
      this.priceCache.lastUpdate = now;
      
      console.log(`✅ Successfully fetched ${Object.keys(prices).length} prices`);
      console.log(`   💰 USDT: $1.00 (stablecoin - hardcoded)`);
      for (const [symbol, price] of Object.entries(prices)) {
        if (symbol !== 'USDT') {
          console.log(`   💰 ${symbol}: $${price}`);
        }
      }
      
      return prices;
      
    } catch (error) {
      console.error('❌ Failed to fetch prices:', error.message);
      if (Object.keys(this.priceCache.data).length > 0) {
        console.log('⚠️  Using cached prices');
        return this.priceCache.data;
      }
      
      console.log('⚠️  Using emergency fallback prices');
      return { 
        'USDT': 1.0,
        'KAIA': 0.0,
        'KUB': 0.0,
        'XTZ': 0.0,
        'MBX': 0.0,
        'STKAIA': 0.0
      };
    }
  }

  async getTokenPrice(underlyingSymbol) {
    try {
      const prices = await this.fetchPrices();
      
      // Handle stablecoins
      if (underlyingSymbol === 'USDT') {
        return 1.0;
      }
      
      // Handle native currencies
      if (underlyingSymbol === 'KAIA' || underlyingSymbol === 'KUB' || underlyingSymbol === 'XTZ') {
        return prices[underlyingSymbol] || 0;
      }
      
      // Handle other tokens
      return prices[underlyingSymbol] || 0;
    } catch (error) {
      console.warn(`⚠️  Failed to get price for ${underlyingSymbol}:`, error.message);
      
      // Fallback for stablecoins
      if (underlyingSymbol === 'USDT') {
        return 1.0;
      }
      
      return 0;
    }
  }

  // Method to get price without async (for compatibility with existing code)
  getPrice(underlyingSymbol) {
    // Return a promise that resolves to the price
    return this.getTokenPrice(underlyingSymbol);
  }

  // Force refresh prices
  async refreshPrices() {
    this.priceCache.lastUpdate = 0; // Reset cache to force refresh
    return await this.fetchPrices();
  }

  // Get cache status
  getCacheStatus() {
    const now = Date.now();
    const age = now - this.priceCache.lastUpdate;
    const isExpired = age > this.priceCache.cacheDuration;
    
    return {
      lastUpdate: this.priceCache.lastUpdate,
      age: age,
      isExpired: isExpired,
      cacheDuration: this.priceCache.cacheDuration,
      priceCount: Object.keys(this.priceCache.data).length
    };
  }
}

module.exports = PriceManager;