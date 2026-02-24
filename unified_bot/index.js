const express = require('express');
const dotenv = require('dotenv'); 
const cors = require('cors');

// Load environment variables
dotenv.config();

const ChainManager = require('./services/ChainManager');
const PointTracker = require('./modules/PointTracker');
const OracleUpdater = require('./modules/OracleUpdater');
const Liquidator = require('./modules/Liquidator');
const { getAllChainIds, getChainConfig } = require('./config/chains');


/**
 * UnifiedBot - Main orchestrator for all bot modules
 * 
 * Responsibilities:
 * - Initialize ChainManager
 * - Create and manage per-chain module instances
 * - Coordinate module lifecycle
 * - Provide health check API
 * - Handle graceful shutdown
 * - CENTRALIZED DAILY SUMMARY (FIXED)
 */
class UnifiedBot {
  constructor() {
    this.chainManager = null;
    this.modules = [];
    this.isInitialized = false;
    this.isRunning = false;
    this.startTime = null;
    this.dailySummaryInterval = null; // Centralized daily summary timer
    
    // Parse enabled chains from environment
    this.enabledChains = this.parseEnabledChains();
  }

  /**
   * Parse enabled chains from environment variable
   * Format: "kaia,kub,etherlink" or "all"
   */
  parseEnabledChains() {
    const chainsEnv = process.env.ENABLED_CHAINS || 'all';
    
    if (chainsEnv === 'all') {
      return getAllChainIds();
    }
    
    const requestedChains = chainsEnv.split(',').map(c => c.trim().toLowerCase());
    const availableChains = getAllChainIds();
    const validChains = requestedChains.filter(c => availableChains.includes(c));
    
    if (validChains.length === 0) {
      console.warn('⚠️  No valid chains specified, defaulting to all chains');
      return availableChains;
    }
    
    return validChains;
  }

  /**
   * Initialize the bot
   */
  async init() {
    try {
      console.log('🚀 KiloLend Unified Bot Starting...');
      console.log('===================================');
      console.log(`📡 Enabled chains: ${this.enabledChains.join(', ')}`);
      
      // Initialize ChainManager
      this.chainManager = new ChainManager({
        enabledChains: this.enabledChains
      });
      
      // IMPORTANT: Wait for ChainManager to fully initialize before adding wallets
      console.log('⏳ Waiting for ChainManager to initialize providers...');
      await this.chainManager.init();
      console.log('✅ ChainManager initialized');
      
      // Add wallet private keys for each chain (if configured)
      for (const chainId of this.enabledChains) {
        const privateKeyEnv = `${chainId.toUpperCase()}_PRIVATE_KEY`;
        const privateKey = process.env[privateKeyEnv];
        
        if (privateKey) {
          try {
            this.chainManager.addWallet(chainId, privateKey);
          } catch (error) {
            console.warn(`⚠️  Failed to add wallet for ${chainId}: ${error.message}`);
          }
        } else {
          console.warn(`⚠️  No wallet configured for ${chainId} (env: ${privateKeyEnv})`);
          console.warn(`   Oracle and Liquidator modules will not work for ${chainId}`);
        }
      }
      
      // Create modules for each enabled chain
      await this.createModules();
      
      this.isInitialized = true;
      console.log('✅ Unified Bot initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Unified Bot:', error.message);
      throw error;
    }
  }

  /**
   * Create and configure modules
   */
  async createModules() {
    console.log('\n🔧 Creating modules...');
    
    // Parse enabled modules from environment
    const modulesEnv = process.env.ENABLED_MODULES || 'pointtracker,oracle,liquidator';
    const enabledModules = modulesEnv.split(',').map(m => m.trim().toLowerCase());
    
    // Create PointTracker instances for each chain
    if (enabledModules.includes('pointtracker')) {
      console.log('   ➕ Creating PointTracker modules...');
      for (const chainId of this.enabledChains) {
        const module = new PointTracker(this.chainManager, { chainId });
        this.modules.push(module);
      }
    }
    
    // Create OracleUpdater instances for each chain (requires wallet)
    if (enabledModules.includes('oracle')) {
      console.log('   ➕ Creating OracleUpdater modules...');
      for (const chainId of this.enabledChains) {
        if (this.chainManager.hasWallet(chainId)) {
          const module = new OracleUpdater(this.chainManager, { chainId });
          this.modules.push(module);
        } else {
          console.warn(`   ⚠️  Skipping OracleUpdater for ${chainId} (no wallet)`);
        }
      }
    }
    
    // Create Liquidator instances for each chain (requires wallet)
    if (enabledModules.includes('liquidator')) {
      console.log('   ➕ Creating Liquidator modules...');
      for (const chainId of this.enabledChains) {
        if (this.chainManager.hasWallet(chainId)) {
          const module = new Liquidator(this.chainManager, { chainId });
          this.modules.push(module);
        } else {
          console.warn(`   ⚠️  Skipping Liquidator for ${chainId} (no wallet)`);
        }
      }
    }
    
    console.log(`✅ Created ${this.modules.length} module instances`);
    
    // Initialize all modules
    console.log('\n🔧 Initializing modules...');
    for (const module of this.modules) {
      try {
        await module.init();
      } catch (error) {
        console.error(`❌ Failed to initialize ${module.name} for ${module.chainId}:`, error.message);
        throw error;
      }
    }
    
    console.log('✅ All modules initialized');
  }

  /**
   * Start centralized daily summary timer (FIXED)
   */
  startDailySummaryTimer() {
    // Run daily summary every 60 minutes (configurable via env)
    const intervalMinutes = parseInt(process.env.DAILY_SUMMARY_INTERVAL_MINUTES) || 60;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`📊 Starting centralized daily summary timer (every ${intervalMinutes} minutes)`);
    
    this.dailySummaryInterval = setInterval(async () => {
      await this.runUnifiedDailySummary();
    }, intervalMs);
    
    // Run immediately on start
    setTimeout(() => {
      this.runUnifiedDailySummary();
    }, 1000); // Small delay to ensure everything is started
  }

  /**
   * Run unified daily summary across all chains (FIXED)
   */
  async runUnifiedDailySummary() {
    try {
      console.log('\n📊 UNIFIED DAILY SUMMARY');
      console.log('==========================');
      
      const pointTrackers = this.modules.filter(m => m.name === 'PointTracker');
      if (pointTrackers.length === 0) {
        console.log('💭 No PointTracker modules found');
        return;
      }
      
      // Aggregate data from all chains
      const allChainData = {};
      let totalUsers = new Set();
      let totalEvents = 0;
      let totalTVLContributed = 0;
      let totalNetContribution = 0;
      let allTVLChanges = {};
      let allBorrowChanges = {};
      
      console.log(`📡 Processing ${pointTrackers.length} chains: ${pointTrackers.map(pt => pt.chainId).join(', ')}`);
      
      // Collect data from all chains
      for (const pointTracker of pointTrackers) {
        const chainId = pointTracker.chainId;
        const statsManager = pointTracker.statsManagers[chainId];
        
        if (!statsManager) {
          console.warn(`⚠️  No stats manager found for ${chainId}`);
          continue;
        }
        
        const currentDate = statsManager.getCurrentDate();
        const userStats = statsManager.getUserStats();
        const users = statsManager.getUsers();
        const events = statsManager.getTotalEvents();
        
        console.log(`📊 ${chainId.toUpperCase()}: ${users.length} users, ${events} events`);
        
        // Aggregate data
        allChainData[chainId] = {
          currentDate,
          userStats,
          users,
          events,
          kiloDistribution: pointTracker.dailyKiloDistribution,
          totalTVLContributed: statsManager.dailyStats.totalTVLContributed,
          totalNetContribution: statsManager.dailyStats.totalNetContribution,
          tvlChanges: statsManager.dailyStats.tvlChanges,
          borrowChanges: statsManager.dailyStats.borrowChanges
        };
        
        // Track unique users across all chains
        users.forEach(user => totalUsers.add(user));
        totalEvents += events;
        totalTVLContributed += statsManager.dailyStats.totalTVLContributed;
        totalNetContribution += statsManager.dailyStats.totalNetContribution;
        
        // Merge market changes
        Object.entries(statsManager.dailyStats.tvlChanges).forEach(([market, change]) => {
          allTVLChanges[market] = (allTVLChanges[market] || 0) + change;
        });
        
        Object.entries(statsManager.dailyStats.borrowChanges).forEach(([market, change]) => {
          allBorrowChanges[market] = (allBorrowChanges[market] || 0) + change;
        });
      }
      
      console.log(`🏆 Cross-chain summary: ${totalUsers.size} unique users, ${totalEvents} total events`);
      console.log(`💰 Total TVL Contributed: $${totalTVLContributed.toFixed(2)}`);
      console.log(`📈 Total Net Contribution: $${totalNetContribution.toFixed(2)}`);
      
      // Calculate cross-chain user stats for point distribution
      const crossChainUserStats = {};
      for (const [chainId, chainData] of Object.entries(allChainData)) {
        for (const [userAddress, userStats] of Object.entries(chainData.userStats)) {
          if (!crossChainUserStats[userAddress]) {
            crossChainUserStats[userAddress] = {
              baseTVL: 0,
              netContribution: 0,
              basePoints: 0,
              multiplier: 1.0,
              finalKilo: 0,
              activities: { supplies: 0, withdraws: 0, borrows: 0, repays: 0 },
              lastBalanceUpdate: null
            };
          }
          
          // Aggregate user data across chains
          const aggregated = crossChainUserStats[userAddress];
          aggregated.baseTVL = Math.max(aggregated.baseTVL, userStats.baseTVL); // Use max TVL
          aggregated.netContribution += userStats.netContribution;
          aggregated.activities.supplies += userStats.activities.supplies;
          aggregated.activities.withdraws += userStats.activities.withdraws;
          aggregated.activities.borrows += userStats.activities.borrows;
          aggregated.activities.repays += userStats.activities.repays;
          aggregated.lastBalanceUpdate = userStats.lastBalanceUpdate || aggregated.lastBalanceUpdate;
        }
      }
      
      // Calculate and distribute KILO points (cross-chain)
      let totalKiloDistributed = 0;
      if (Object.keys(crossChainUserStats).length > 0) {
        // Use total KILO distribution from all chains combined
        const totalKiloDistribution = pointTrackers.reduce((sum, pt) => sum + pt.dailyKiloDistribution, 0);
        const kiloCalculator = pointTrackers[0].kiloCalculator; // Use first calculator
        
        if (kiloCalculator) {
          const distributions = await kiloCalculator.calculateKiloPoints(crossChainUserStats);
          totalKiloDistributed = distributions.reduce((sum, d) => sum + d.kiloAmount, 0);
          
          console.log(`💎 Cross-chain KILO distribution: ${distributions.length} users, ${totalKiloDistributed.toLocaleString()} KILO`);
          
          // Store to database (single unified entry)
          if (pointTrackers[0].databaseService && distributions.length > 0) {
            console.log('\n💾 STORING UNIFIED DATA TO DATABASE...');
            console.log('===================================');
            
            const summary = {
              uniqueUsers: totalUsers.size,
              totalEvents: totalEvents,
              totalTVLContributed: totalTVLContributed,
              totalNetContribution: totalNetContribution,
              netTVLChange: Object.values(allTVLChanges).reduce((sum, change) => sum + change, 0),
              netBorrowChange: Object.values(allBorrowChanges).reduce((sum, change) => sum + change, 0),
              tvlChangesByMarket: allTVLChanges,
              borrowChangesByMarket: allBorrowChanges,
              chainsProcessed: Object.keys(allChainData),
              crossChain: true
            };
            
            await pointTrackers[0].databaseService.storeDailySummary(
              new Date().toISOString().split('T')[0],
              distributions,
              summary
            );
          } else if (!distributions || distributions.length === 0) {
            console.log('\n💾 No cross-chain distributions to store to database');
          }
        } else {
          console.log('\n💎 No KILO calculator available for cross-chain distribution');
        }
      } else {
        console.log('\n💎 No cross-chain user activity for KILO distribution today');
      }
      
      console.log('==========================\n');
      
    } catch (error) {
      console.error('❌ Error in unified daily summary:', error.message);
      console.error('💡 Continuing with next cycle...');
    }
  }

  /**
   * Start the bot
   */
  async start() {
    if (!this.isInitialized) {
      throw new Error('Bot must be initialized before starting');
    }
    
    try {
      console.log('\n🚀 Starting Unified Bot...');
      this.startTime = new Date();
      this.isRunning = true;
      
      // Start all modules (except PointTracker daily summaries which are centralized)
      for (const module of this.modules) {
        if (module.name === 'PointTracker') {
          // Disable individual daily summary timers for PointTrackers
          if (module.disableDailySummaryTimer) {
            module.disableDailySummaryTimer();
          }
        }
        await module.start();
      }
      
      // Start centralized daily summary timer (FIXED)
      this.startDailySummaryTimer();
      
      console.log('\n✅ Unified Bot is running');
      console.log('===================================');
      console.log(`📊 Modules active: ${this.modules.filter(m => m.enabled).length}`);
      console.log(`📡 Chains active: ${this.enabledChains.length}`);
      console.log(`⏰ Started at: ${this.startTime.toISOString()}`);
      console.log('===================================\n');
      
    } catch (error) {
      console.error('❌ Failed to start Unified Bot:', error.message);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the bot gracefully
   */
  async stop() {
    console.log('\n🛑 Stopping Unified Bot...');
    
    try {
      // Stop centralized daily summary timer
      if (this.dailySummaryInterval) {
        clearInterval(this.dailySummaryInterval);
        this.dailySummaryInterval = null;
      }
      
      // Stop all modules
      for (const module of this.modules) {
        await module.stop();
      }
      
      // Shutdown ChainManager
      if (this.chainManager) {
        await this.chainManager.shutdown();
      }
      
      this.isRunning = false;
      console.log('✅ Unified Bot stopped gracefully');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }
  }

  /**
   * Get overall health status
   */
  getHealthStatus() {
    const chainHealth = this.chainManager?.getHealthStatus() || {};
    const moduleHealth = this.modules.map(m => m.getHealthStatus());
    
    const healthyModules = moduleHealth.filter(m => m.status === 'healthy').length;
    
    return {
      status: this.isInitialized && this.isRunning && chainHealth.isInitialized ? 'healthy' : 'unhealthy',
      initialized: this.isInitialized,
      running: this.isRunning,
      startTime: this.startTime?.toISOString(),
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
      chains: this.enabledChains,
      chainHealth,
      modules: {
        total: this.modules.length,
        healthy: healthyModules,
        unhealthy: this.modules.length - healthyModules,
        details: moduleHealth
      },
      centralizedDailySummary: this.dailySummaryInterval !== null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Print status summary
   */
  printStatus() {
    console.log('\n📊 UNIFIED BOT STATUS');
    console.log('====================');
    console.log(`Status: ${this.isRunning ? 'RUNNING 🟢' : 'STOPPED 🔴'}`);
    console.log(`Uptime: ${this.formatUptime(this.getHealthStatus().uptime)}`);
    console.log(`Chains: ${this.enabledChains.join(', ')}`);
    console.log(`Modules: ${this.modules.length} total`);
    console.log(`Daily Summary: ${this.dailySummaryInterval ? 'CENTRALIZED ✅' : 'DISABLED ❌'}`);
    
    // Module summary
    const moduleTypes = {};
    for (const module of this.modules) {
      if (!moduleTypes[module.name]) {
        moduleTypes[module.name] = { total: 0, healthy: 0 };
      }
      moduleTypes[module.name].total++;
      if (module.getHealthStatus().status === 'healthy') {
        moduleTypes[module.name].healthy++;
      }
    }
    
    console.log('\nModule Status:');
    for (const [name, stats] of Object.entries(moduleTypes)) {
      const status = stats.healthy === stats.total ? '✅' : '⚠️';
      console.log(`  ${status} ${name}: ${stats.healthy}/${stats.total} healthy`);
    }
    
    console.log('====================\n');
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  const bot = new UnifiedBot();
  
  // Setup Express server for health checks
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Middleware for JSON parsing and CORS
  app.use(express.json());
  app.use(cors());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    const health = bot.getHealthStatus();
    
    if (health.status === 'healthy') {
      res.status(200).json(health);
    } else {
      res.status(503).json(health);
    }
  });
  
  // Status endpoint
  app.get('/status', (req, res) => {
    res.status(200).json(bot.getHealthStatus());
  });
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'KiloLend Unified Bot',
      version: '1.0.0',
      features: ['centralized_daily_summary', 'cross_chain_aggregation', 'no_point_duplication'],
      endpoints: {
        health: '/health',
        status: '/status',
        triggerDailyUpdate: '/trigger-daily-update (POST)'
      }
    });
  });
  
  // Manual trigger endpoint for unified daily point calculation (FIXED)
  app.post('/trigger-daily-update', async (req, res) => {
    try {
      console.log('\n🚀 MANUAL TRIGGER: Unified Daily Point Update Requested');
      console.log('='.repeat(60));
      
      // Use the unified daily summary instead of per-chain processing
      await bot.runUnifiedDailySummary();
      
      console.log('='.repeat(60));
      console.log('✅ Manual unified daily update completed successfully');
      
      res.json({
        success: true,
        message: 'Manual unified daily update completed successfully',
        timestamp: new Date().toISOString(),
        features: ['cross_chain_aggregation', 'no_point_duplication', 'single_database_entry']
      });
      
    } catch (error) {
      console.error('❌ Manual trigger failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    // Initialize and start bot
    await bot.init();
    await bot.start();
    
    // Print initial status
    bot.printStatus();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Health check server running on port ${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`📋 Status: http://localhost:${PORT}/status\n`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });
    
    // Print status every hour
    setInterval(() => {
      bot.printStatus();
    }, 60 * 60 * 1000);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Start bot
if (require.main === module) {
  main();
}

module.exports = UnifiedBot;