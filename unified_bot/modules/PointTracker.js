const { ethers } = require('ethers');
const axios = require('axios');
const BaseModule = require('./BaseModule');
const DatabaseService = require('../services/DatabaseService');
const BalanceManager = require('../services/BalanceManager');
const KiloPointCalculator = require('../services/KiloPointCalculator');
const PriceManager = require('../services/PriceManager');
const { getChainContracts, getChainMarkets, getKiloDistribution } = require('../config/chains');

// CToken ABI - events we need to listen to
const CTOKEN_ABI = [
  "event Mint(address minter, uint256 mintAmount, uint256 mintTokens)",
  "event Redeem(address redeemer, uint256 redeemAmount, uint256 redeemTokens)",
  "event Borrow(address borrower, uint borrowAmount, uint accountBorrows, uint totalBorrows, uint borrowRateDiscountBps, uint actualBorrowRate)",
  "event RepayBorrow(address payer, address borrower, uint repayAmount, uint accountBorrows, uint totalBorrows, uint borrowRateDiscountBps, uint actualBorrowRate)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function underlying() view returns (address)"
];

/**
 * PointTracker - Tracks KILO points for supply/borrow activities across all chains
 * 
 * Responsibilities:
 * - Monitor Mint/Redeem/Borrow/Repay events
 * - Calculate KILO points based on TVL
 * - Support per-chain KILO distribution
 * - Daily point distribution (CENTRALIZED MODE)
 */
class PointTracker extends BaseModule {
  constructor(chainManager, options = {}) {
    super('PointTracker', chainManager, options);
    
    // Configuration
    this.apiBaseUrl = process.env.API_BASE_URL;
    this.pollInterval = (parseInt(process.env.POLL_INTERVAL_SECONDS) || 60) * 1000;
    this.scanWindowSeconds = parseInt(process.env.SCAN_WINDOW_SECONDS) || 60;
    this.maxBlocksPerScan = parseInt(process.env.MAX_BLOCKS_PER_SCAN) || 100;
    
    // Per-chain configuration
    this.chainId = options.chainId;
    this.dailyKiloDistribution = this.chainId ? 
      getKiloDistribution(this.chainId) : 0;
    
    // Chain-specific markets
    this.markets = this.buildMarketsConfig();
    
    // Tracking state
    this.lastProcessedBlocks = {};
    this.statsManagers = {}; // One per chain
    this.priceManagers = {};
    this.balanceManagers = {};
    
    // Event counts
    this.totalEvents = 0;
    
    // Services for user initialization
    this.databaseService = new DatabaseService();
    this.balanceManager = null; // Will be initialized after we have a provider
    this.kiloCalculator = null;
  }

  /**
   * Build markets configuration for the chain
   */
  buildMarketsConfig() {
    if (!this.chainId) return {};
    
    const chainContracts = getChainContracts(this.chainId);
    const chainMarkets = getChainMarkets(this.chainId);
    const markets = {};
    
    // Map cTokens to their underlying tokens
    for (const [key, contractAddress] of Object.entries(chainContracts)) {
      if (key.startsWith('c')) { // cTokens only
        const symbol = key.substring(1); // Remove 'c' prefix
        const marketInfo = Object.values(chainMarkets).find(m => m.symbol === symbol);
        
        if (marketInfo) {
          const underlyingKey = symbol.toUpperCase();
          const underlyingAddress = chainContracts[underlyingKey] || ethers.ZeroAddress;
          
          markets[contractAddress] = {
            symbol: key,
            underlying: underlyingAddress,
            underlyingSymbol: marketInfo.symbol,
            decimals: marketInfo.decimals
          };
        }
      }
    }
    
    return markets;
  }

  async initialize() {
    // Initialize services for this chain
    this.initializeServices();
    
    // Initialize block tracking
    const provider = this.chainManager.getProvider(this.chainId);
    this.lastProcessedBlocks[this.chainId] = await provider.getBlockNumber();
    
    this.log(`Tracking ${Object.keys(this.markets).length} markets`, 'info');
    this.log(`Daily KILO distribution: ${this.dailyKiloDistribution.toLocaleString()}`, 'info');
  }

    initializeServices() {
    // Store API URL for use in nested functions
    const apiBaseUrl = this.apiBaseUrl;
    const chainId = this.chainId;
    const self = this; // Store reference to PointTracker instance
    
    // Full StatsManager implementation - FIXED VERSION
    this.statsManagers[this.chainId] = {
      dailyStats: {
        users: new Set(),
        totalEvents: 0,
        userStats: {},
        totalTVLContributed: 0,
        totalNetContribution: 0,
        tvlChanges: {},
        borrowChanges: {}
      },
      currentDate: new Date().toISOString().split('T')[0],
      
      getCurrentDate() {
        return new Date().toISOString().split('T')[0];
      },
      
      reset() {
        // CRITICAL FIX: Don't preserve any user data here - let reinitializeExistingUsers() handle everything
        // This ensures ALL users from database (including new users) are loaded, not just those in memory
        this.dailyStats = {
          users: new Set(),
          totalEvents: 0,
          userStats: {},
          totalTVLContributed: 0,
          totalNetContribution: 0,
          tvlChanges: {},
          borrowChanges: {}
        };
        
        // Return empty to signal that complete reinitialization is needed
        return {};
      },
      
      initializeUserStats(userAddress) {
        if (!this.dailyStats.userStats[userAddress]) {
          this.dailyStats.userStats[userAddress] = {
            baseTVL: 0,
            netContribution: 0,
            basePoints: 0,
            multiplier: 1.0,
            finalKilo: 0,
            activities: {
              supplies: 0,
              withdraws: 0,
              borrows: 0,
              repays: 0
            },
            // FIXED: balanceBreakdown commented out like working version
            // balanceBreakdown: {},
            lastBalanceUpdate: null
          };
        }
      },
      
      updateUserStats(userAddress, usdValue, type) {
        this.initializeUserStats(userAddress);
        
        const userStats = this.dailyStats.userStats[userAddress];
        
        switch (type) {
          case 'mint':
            userStats.activities.supplies++;
            userStats.netContribution += usdValue;
            this.dailyStats.totalTVLContributed += usdValue;
            this.dailyStats.totalNetContribution += usdValue;
            break;
            
          case 'redeem':
            userStats.activities.withdraws++;
            userStats.netContribution -= usdValue;
            this.dailyStats.totalNetContribution -= usdValue;
            break;
            
          case 'borrow':
            userStats.activities.borrows++;
            userStats.netContribution -= usdValue;
            this.dailyStats.totalTVLContributed += usdValue;
            this.dailyStats.totalNetContribution -= usdValue;
            break;
            
          case 'repay':
            userStats.activities.repays++;
            userStats.netContribution += usdValue;
            this.dailyStats.totalNetContribution += usdValue;
            break;
        }
      },
      
      initializeUserBaseTVL(userAddress, totalBaseTVL, marketBreakdown) {
        this.initializeUserStats(userAddress);
        
        const userStats = this.dailyStats.userStats[userAddress];
        userStats.baseTVL = totalBaseTVL;
        // FIXED: Commented out balanceBreakdown like working version
        // userStats.balanceBreakdown = marketBreakdown;
        userStats.lastBalanceUpdate = new Date().toISOString();
        
        this.dailyStats.users.add(userAddress);
      },
      
      updateUserBaseTVL(userAddress, baseTVLData) {
        this.initializeUserStats(userAddress);
        
        const userStats = this.dailyStats.userStats[userAddress];
        userStats.baseTVL = baseTVLData.totalBaseTVL;
        // FIXED: Commented out balanceBreakdown like working version
        // userStats.balanceBreakdown = baseTVLData.marketBreakdown;
        userStats.lastBalanceUpdate = new Date().toISOString();
      },
      
      updateDailyStats(user, market, usdValue, type) {
        const currentDate = this.getCurrentDate();
        if (currentDate !== this.currentDate) {
          this.currentDate = currentDate;
          // FIXED: Remove premature reset() call - only signal day change like old version
          // Let printDailySummary() handle the actual reset and user reloading
          return true; // Signal that a new day started
        }

        this.dailyStats.users.add(user);
        this.dailyStats.totalEvents++;

        if (!this.dailyStats.tvlChanges[market]) {
          this.dailyStats.tvlChanges[market] = 0;
        }
        if (!this.dailyStats.borrowChanges[market]) {
          this.dailyStats.borrowChanges[market] = 0;
        }

        switch (type) {
          case 'mint':
            this.dailyStats.tvlChanges[market] += usdValue;
            break;
          case 'redeem':
            this.dailyStats.tvlChanges[market] -= usdValue;
            break;
          case 'borrow':
            this.dailyStats.borrowChanges[market] += usdValue;
            break;
          case 'repay':
            this.dailyStats.borrowChanges[market] -= usdValue;
            break;
        }

        this.updateUserStats(user, usdValue, type);
        
        return false; // No new day
      },
      
      async printDailySummary(kiloCalculator, balanceManager = null, databaseService = null, chainId = null) {
        // Check if we need to reset daily stats before printing
        const currentDate = this.getCurrentDate();
        let dayChanged = false;
        if (currentDate !== this.currentDate) {
          this.currentDate = currentDate;
          this.reset();
          dayChanged = true;
          
          // CRITICAL FIX: Reinitialize ALL users from database after day reset
          // This ensures new users who haven't had activity are still tracked
          if (databaseService && balanceManager) {
            await this.reinitializeExistingUsers(databaseService, balanceManager);
          }
        }
        
        console.log('\n📊 DAILY SUMMARY');
        console.log('================');
        console.log(`📅 Date: ${this.currentDate}`);
        console.log(`👥 Unique Users: ${this.dailyStats.users.size}`);
        console.log(`🎯 Total Events: ${this.dailyStats.totalEvents}`);
        console.log(`💰 Total TVL Contributed: $${this.dailyStats.totalTVLContributed.toFixed(2)}`);
        console.log(`📈 Total Net Contribution: $${this.dailyStats.totalNetContribution.toFixed(2)}`);
        
        console.log('\n💰 TVL Changes by Market:');
        let totalTVLChange = 0;
        for (const [market, change] of Object.entries(this.dailyStats.tvlChanges)) {
          console.log(`  ${market}: ${change >= 0 ? '+' : ''}$${change.toFixed(2)}`);
          totalTVLChange += change;
        }
        console.log(`  🏆 Net TVL Change: ${totalTVLChange >= 0 ? '+' : ''}$${totalTVLChange.toFixed(2)}`);

        console.log('\n🏦 Borrow Changes by Market:');
        let totalBorrowChange = 0;
        for (const [market, change] of Object.entries(this.dailyStats.borrowChanges)) {
          console.log(`  ${market}: ${change >= 0 ? '+' : ''}$${change.toFixed(2)}`);
          totalBorrowChange += change;
        }
        console.log(`  🏆 Net Borrow Change: ${totalBorrowChange >= 0 ? '+' : ''}$${totalBorrowChange.toFixed(2)}`);

        // Calculate base TVL for all users if balance manager is available
        if (balanceManager) {
          const userAddresses = Array.from(this.dailyStats.users);
          if (userAddresses.length > 0) {
            const baseTVLData = await balanceManager.calculateBaseTVLForUsers(userAddresses);
            
            // Update user stats with base TVL
            for (const [userAddress, data] of Object.entries(baseTVLData)) {
              this.updateUserBaseTVL(userAddress, data);
            }
          }
        }

        // Calculate and display KILO point distribution
        let distributions = [];
        if (Object.keys(this.dailyStats.userStats).length > 0) {
          distributions = await kiloCalculator.calculateKiloPoints(this.dailyStats.userStats);
        } else {
          console.log('\n💎 No user activity for KILO distribution today');
        }

        // Store to database if available
        if (databaseService && distributions && distributions.length > 0) {
          console.log('\n💾 STORING TO DATABASE...');
          console.log('==========================');
          
          const summary = {
            uniqueUsers: this.dailyStats.users.size,
            totalEvents: this.dailyStats.totalEvents,
            totalTVLContributed: this.dailyStats.totalTVLContributed,
            totalNetContribution: this.dailyStats.totalNetContribution,
            netTVLChange: totalTVLChange,
            netBorrowChange: totalBorrowChange,
            tvlChangesByMarket: this.dailyStats.tvlChanges,
            borrowChangesByMarket: this.dailyStats.borrowChanges
          };

          await databaseService.storeDailySummary(this.currentDate, distributions, summary);
        } else if (databaseService && (!distributions || distributions.length === 0)) {
          console.log('\n💾 No distributions to store to database');
        }

        console.log('================\n');
        
        return distributions;
      },
      
      getUserStats() {
        return this.dailyStats.userStats;
      },
      
      getTotalEvents() {
        return this.dailyStats.totalEvents;
      },
      
      getUsers() {
        return Array.from(this.dailyStats.users);
      },
      
      /**
       * CRITICAL FIX: Re-initialize ALL existing users after daily reset
       * This ensures users with base TVL are tracked even without daily activity
       * Most importantly, this loads ALL users from database, not just those in memory
       */
      async reinitializeExistingUsers(databaseService, balanceManager) {
        try {
          console.log('\n🔄 RE-INITIALIZING USERS AFTER DAILY RESET...');
          console.log('==========================================');
          
          // Get ALL users from the database (including new users who haven't had activity)
          const allUsers = await databaseService.getAllUsers();
          
          if (allUsers.length === 0) {
            console.log('💭 No existing users found in the system');
            return;
          }
          
          console.log(`🚀 Found ${allUsers.length} existing users, re-calculating base TVL...`);
          
          // Calculate base TVL for ALL existing users
          const existingUserBaseTVL = await balanceManager.calculateBaseTVLForUsers(allUsers);
          
          // Re-initialize stats manager with ALL existing users' base TVL
          let usersWithTVL = 0;
          let usersWithZeroTVL = 0;
          let usersWithErrors = 0;
          
          for (const userAddress of allUsers) {
            const baseTVLData = existingUserBaseTVL[userAddress];
            
            if (baseTVLData && baseTVLData.error) {
              console.log(`❌ Error calculating TVL for ${userAddress.slice(0, 8)}...: ${baseTVLData.error}`);
              usersWithErrors++;
              // Still initialize with zero TVL to ensure user is tracked
              this.initializeUserBaseTVL(userAddress, 0, {});
              this.dailyStats.users.add(userAddress);
            } else if (baseTVLData) {
              if (baseTVLData.totalBaseTVL > 0) {
                this.initializeUserBaseTVL(userAddress, baseTVLData.totalBaseTVL, baseTVLData.marketBreakdown);
                this.dailyStats.users.add(userAddress);
                console.log(`✅ Re-initialized ${userAddress.slice(0, 8)}... with ${baseTVLData.totalBaseTVL.toFixed(2)} base TVL (${baseTVLData.marketsWithBalance || 0} markets)`);
                usersWithTVL++;
              } else {
                this.initializeUserBaseTVL(userAddress, 0, baseTVLData.marketBreakdown);
                this.dailyStats.users.add(userAddress);
                console.log(`💭 Re-initialized ${userAddress.slice(0, 8)}... with 0.00 base TVL (no balances)`);
                usersWithZeroTVL++;
              }
            } else {
              console.log(`⚠️  No TVL data found for ${userAddress.slice(0, 8)}...`);
              usersWithErrors++;
              // Still initialize with zero TVL to ensure user is tracked
              this.initializeUserBaseTVL(userAddress, 0, {});
              this.dailyStats.users.add(userAddress);
            }
          }
          
          console.log(`\n🏆 Re-initialization Complete:`);
          console.log(`   • Total users re-loaded: ${allUsers.length}`);
          console.log(`   • Users with TVL > 0: ${usersWithTVL}`);
          console.log(`   • Users with TVL = 0: ${usersWithZeroTVL}`);
          console.log(`   • Users with errors: ${usersWithErrors}`);
          console.log(`   • Total users tracked: ${this.dailyStats.users.length}`);
          console.log('==========================================\n');
          
        } catch (error) {
          console.error('❌ Error re-initializing existing users:', error.message);
          console.log('💡 Continuing without existing user data - new events will still be tracked');
        }
      }
    };
    
    // Use the new PriceManager service
    this.priceManagers[this.chainId] = new PriceManager(`${apiBaseUrl}/prices`);
    
    // Balance manager - will be properly initialized in initializeExistingUsers()
    this.balanceManagers[this.chainId] = null;
    
    // KILO Point Calculator
    this.kiloCalculator = new KiloPointCalculator(this.dailyKiloDistribution);
  }


  /**
   * Initialize existing users and calculate their base TVL
   * This ensures users who contributed before the bot started are included
   */
  async initializeExistingUsers() {
    try {
      this.log('Initializing existing users...', 'info');
      
      // Fetch ALL users from the API
      const allUsers = await this.databaseService.getAllUsers();
      
      if (allUsers.length === 0) {
        this.log('No existing users found in the system', 'info');
        return;
      }
      
      this.log(`Found ${allUsers.length} existing users, calculating base TVL...`, 'info');
      
      // Initialize BalanceManager with provider and markets
      const provider = this.chainManager.getProvider(this.chainId);
      this.balanceManager = new BalanceManager(provider, this.markets);
      
      // Also store it in balanceManagers for consistency
      this.balanceManagers[this.chainId] = this.balanceManager;
      
      // Calculate base TVL for all existing users
      const existingUserBaseTVL = await this.balanceManager.calculateBaseTVLForUsers(allUsers);
      
      const statsManager = this.statsManagers[this.chainId];
      
      // Initialize stats manager with existing users' base TVL
      let usersWithTVL = 0;
      let usersWithZeroTVL = 0;
      let usersWithErrors = 0;
      
      for (const userAddress of allUsers) {
        const baseTVLData = existingUserBaseTVL[userAddress];
        
        if (baseTVLData && baseTVLData.error) {
          this.log(`Error calculating TVL for ${userAddress.slice(0, 8)}...: ${baseTVLData.error}`, 'error');
          usersWithErrors++;
          // Still initialize with zero TVL to ensure user is tracked
          statsManager.initializeUserBaseTVL(userAddress, 0, {});
        } else if (baseTVLData) {
          if (baseTVLData.totalBaseTVL > 0) {
            statsManager.initializeUserBaseTVL(
              userAddress,
              baseTVLData.totalBaseTVL,
              baseTVLData.marketBreakdown
            );
            this.log(`Initialized ${userAddress.slice(0, 8)}... with ${baseTVLData.totalBaseTVL.toFixed(2)} base TVL`, 'info');
            usersWithTVL++;
          } else {
            statsManager.initializeUserBaseTVL(
              userAddress,
              0,
              baseTVLData.marketBreakdown
            );
            usersWithZeroTVL++;
          }
        } else {
          this.log(`No TVL data found for ${userAddress.slice(0, 8)}...`, 'warning');
          usersWithErrors++;
          // Still initialize with zero TVL to ensure user is tracked
          statsManager.initializeUserBaseTVL(userAddress, 0, {});
        }
      }
      
      this.log(`Initialization Complete:`, 'success');
      this.log(`   • Total users loaded: ${allUsers.length}`, 'info');
      this.log(`   • Users with TVL > 0: ${usersWithTVL}`, 'info');
      this.log(`   • Users with TVL = 0: ${usersWithZeroTVL}`, 'info');
      this.log(`   • Users with errors: ${usersWithErrors}`, 'info');
      this.log(`   • Total users tracked: ${statsManager.getUsers().length}`, 'info');
      
      // Verify all users are being tracked
      const trackedUsers = statsManager.getUsers();
      if (trackedUsers.length !== allUsers.length) {
        this.log(`Warning: Only ${trackedUsers.length}/${allUsers.length} users are being tracked!`, 'warning');
      } else {
        this.log(`All ${allUsers.length} users are successfully being tracked`, 'success');
      }
      
    } catch (error) {
      this.handleError(error, 'initializeExistingUsers');
      this.log('Continuing without existing user data - new events will still be tracked', 'info');
    }
  }

  async run() {
    this.log('Starting point tracking...', 'info');
    
    // Initialize and fetch initial prices
    const priceManager = this.priceManagers[this.chainId];
    await priceManager.fetchPrices();
    
    // Initialize existing users with their base TVL
    await this.initializeExistingUsers();
    
    // Start polling loop
    this.processRecentEvents();
    
    this.pollingInterval = setInterval(() => {
      this.processRecentEvents();
    }, this.pollInterval);
    
    // NOTE: Daily summary timer is now handled by centralized bot
    // Only start individual timer if not in centralized mode
    if (!process.env.CENTRALIZED_DAILY_SUMMARY || process.env.CENTRALIZED_DAILY_SUMMARY === 'false') {
      this.summaryInterval = setInterval(() => {
        this.printDailySummary();
      }, 60 * 60 * 1000);
      this.log(`Starting individual daily summary timer (non-centralized mode)`, 'info');
    } else {
      this.log(`Daily summary timer disabled (centralized mode)`, 'info');
    }
    
    this.log(`Polling every ${this.pollInterval / 1000}s, scanning ${this.scanWindowSeconds}s window`, 'info');
  }

  async processRecentEvents() {
    try {
      const provider = this.chainManager.getProvider(this.chainId);
      const currentBlock = await provider.getBlockNumber();
      
      const blocksToScan = Math.min(this.scanWindowSeconds, this.maxBlocksPerScan);
      const fromBlock = Math.max(
        currentBlock - blocksToScan,
        this.lastProcessedBlocks[this.chainId] || currentBlock - blocksToScan
      );
      const toBlock = currentBlock;

      if (toBlock <= fromBlock) {
        return;
      }

      await this.scanBlockRange(fromBlock, toBlock);
      
    } catch (error) {
      this.handleError(error, 'processRecentEvents');
    }
  }

  async scanBlockRange(fromBlock, toBlock) {
    const provider = this.chainManager.getProvider(this.chainId);
    let totalEvents = 0;
    let successfulMarkets = 0;
    let failedMarkets = 0;

    for (const [cTokenAddress, market] of Object.entries(this.markets)) {
      try {
        const events = await this.getMarketEvents(cTokenAddress, market, fromBlock, toBlock);
        
        if (events.length > 0) {
          this.log(`Processed ${events.length} events for ${market.symbol}`, 'info');
          totalEvents += events.length;
        }
        
        successfulMarkets++;
        
      } catch (error) {
        this.handleError(error, `processing ${market.symbol}`);
        failedMarkets++;
      }
    }

    if (successfulMarkets > 0) {
      this.lastProcessedBlocks[this.chainId] = toBlock;
    }

    if (totalEvents > 0) {
      this.totalEvents += totalEvents;
      this.log(`Scan complete: ${totalEvents} events (${successfulMarkets} markets)`, 'success');
      this.recordSuccess();
    }
  }

  async getMarketEvents(cTokenAddress, market, fromBlock, toBlock, maxRetries = 3) {
    const provider = this.chainManager.getProvider(this.chainId);
    const contract = new ethers.Contract(cTokenAddress, CTOKEN_ABI, provider);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [mintEvents, redeemEvents, borrowEvents, repayEvents] = await Promise.all([
          contract.queryFilter(contract.filters.Mint(), fromBlock, toBlock),
          contract.queryFilter(contract.filters.Redeem(), fromBlock, toBlock),
          contract.queryFilter(contract.filters.Borrow(), fromBlock, toBlock),
          contract.queryFilter(contract.filters.RepayBorrow(), fromBlock, toBlock)
        ]);

        const allEvents = [
          ...mintEvents.map(e => ({ ...e, type: 'mint' })),
          ...redeemEvents.map(e => ({ ...e, type: 'redeem' })),
          ...borrowEvents.map(e => ({ ...e, type: 'borrow' })),
          ...repayEvents.map(e => ({ ...e, type: 'repay' }))
        ];

        allEvents.sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) {
            return a.blockNumber - b.blockNumber;
          }
          return a.transactionIndex - b.transactionIndex;
        });

        for (const event of allEvents) {
          await this.handleEvent(event, market);
        }

        return allEvents;

      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delay);
      }
    }
  }

  async handleEvent(event, market) {
    try {
      const priceManager = this.priceManagers[this.chainId];
      const statsManager = this.statsManagers[this.chainId];
      
      let amount, usdValue, user;
      
      switch (event.type) {
        case 'mint':
          user = event.args[0];
          amount = event.args[1];
          break;
        case 'redeem':
          user = event.args[0];
          amount = event.args[1];
          break;
        case 'borrow':
          user = event.args[0];
          amount = event.args[1];
          break;
        case 'repay':
          user = event.args[1]; // Borrower
          amount = event.args[2];
          break;
      }
      
      const tokenAmount = parseFloat(this.formatTokenAmount(amount, market.decimals));
      const tokenPrice = await priceManager.getTokenPrice(market.underlyingSymbol);
      usdValue = tokenAmount * tokenPrice;
      
      // Detailed logging for debugging
      console.log(`🔍 ${event.type.toUpperCase()} EVENT DETAILS:`);
      console.log(`   👤 User: ${user}`);
      console.log(`   📍 Market: ${market.symbol} (${market.underlyingSymbol})`);
      console.log(`   💰 Token Amount: ${tokenAmount.toFixed(6)} ${market.underlyingSymbol}`);
      console.log(`   💵 Token Price: $${tokenPrice.toFixed(6)}`);
      console.log(`   💲 USD Value: $${usdValue.toFixed(2)}`);
      console.log(`   📦 Block: ${event.blockNumber}`);
      console.log(`   🆔 Tx: ${event.transactionHash}`);
      
      statsManager.updateDailyStats(user, market.underlyingSymbol, usdValue, event.type);
      
      this.log(`${event.type.toUpperCase()}: ${user.slice(0, 8)}... $${usdValue.toFixed(2)} ${market.underlyingSymbol}`, 'info');
      
    } catch (error) {
      this.handleError(error, 'handleEvent');
    }
  }

  printDailySummary() {
    const statsManager = this.statsManagers[this.chainId];
    const kiloCalculator = this.kiloCalculator;
    const balanceManager = this.balanceManager;
    const databaseService = this.databaseService;
    
    statsManager.printDailySummary(kiloCalculator, balanceManager, databaseService, this.chainId);
  }

  /**
   * Disable daily summary timer (used by centralized bot) - FIXED
   */
  disableDailySummaryTimer() {
    if (this.summaryInterval) {
      clearInterval(this.summaryInterval);
      this.summaryInterval = null;
      this.log('Daily summary timer disabled (centralized mode)', 'info');
    }
  }

  async cleanup() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.summaryInterval) {
      clearInterval(this.summaryInterval);
    }
    this.log('PointTracker cleanup complete', 'success');
  }

  formatTokenAmount(amount, decimals) {
    return ethers.formatUnits(amount, decimals);
  }

  getHealthStatus() {
    const baseStatus = super.getHealthStatus();
    return {
      ...baseStatus,
      chainsTracked: 1,
      marketsTracked: Object.keys(this.markets).length,
      totalEvents: this.totalEvents,
      dailyKiloDistribution: this.dailyKiloDistribution,
      lastProcessedBlock: this.lastProcessedBlocks[this.chainId]
    };
  }
}

module.exports = PointTracker;