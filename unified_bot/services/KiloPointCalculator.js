const axios = require('axios');

/**
 * KILO Point Calculation Engine
 * Handles the complex point calculation and distribution logic
 */
class KiloPointCalculator {
  constructor(dailyKiloDistribution = 100000) {
    this.dailyKiloDistribution = dailyKiloDistribution;
    this.apiBaseUrl = process.env.API_BASE_URL;
    this.timeout = 10000; // 10 second timeout
  }

  /**
   * Get invite multiplier for a user from the invite API
   * Falls back to 1.0 if API call fails or user not found
   */
  async getInviteMultiplier(userAddress) {
    try {
      if (!this.apiBaseUrl) {
        console.warn('⚠️  API_BASE_URL not configured, using default multiplier');
        return 1.0;
      }

      const response = await axios.get(
        `${this.apiBaseUrl}/invite/${userAddress.toLowerCase()}`,
        { timeout: this.timeout }
      );

      if (response.data && response.data.success) {
        const multiplier = response.data.data.multiplier || 1.0;
        console.log(`🎯 User ${userAddress.slice(0, 8)}... invite multiplier: ${multiplier.toFixed(2)}x`);
        return multiplier;
      } else {
        console.log(`📋 User ${userAddress.slice(0, 8)}... not found in invite system, using default 1.0x`);
        return 1.0;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`📋 User ${userAddress.slice(0, 8)}... not in invite system, using default 1.0x`);
      } else {
        console.warn(`⚠️  Failed to get invite multiplier for ${userAddress.slice(0, 8)}...: ${error.message}`);
      }
      return 1.0; // Default on error
    }
  }

  // Get comprehensive multiplier for a user
  async getUserMultiplier(userAddress, userStats = null) {
    try {
      // Get base invite multiplier
      let totalMultiplier = await this.getInviteMultiplier(userAddress);
       
      
      return totalMultiplier;
      
    } catch (error) {
      console.warn(`⚠️  Failed to get multiplier for ${userAddress}:`, error.message);
      return 1.0; // Default on error
    }
  }

  async calculateKiloPoints(userStats) {
    const users = Object.keys(userStats);
    if (users.length === 0) {
      console.log('🔧 No users found, returning empty array');
      return [];
    }

    console.log('\n🧮 CALCULATING KILO POINTS...');
    console.log('==============================');
    console.log('💡 Formula: (Base TVL × 50%) + (Net Contribution × 50%)');
    console.log('💡 Base TVL = Sum of cToken share percentages across all markets');
    console.log('💡 Net Contribution = (Supply - Withdraw) - (Borrow - Repay)');
    console.log('💡 Final Points = Base Points × Invite Multiplier');
    console.log('');

    // Step 1: Calculate base points for each user using the formula:
    // base point (TVL contribution) x 50% + net contribution to TVL x 50%
    let totalBasePoints = 0;
    
    for (const userAddress of users) {
      const stats = userStats[userAddress];
      
      // Calculate user base points using the 50/50 formula
      const basePoints = stats.baseTVL * 0.5; // we use reduce this weight if TVL is large enough
      const netPoints = Math.max(0, stats.netContribution) * 0.5; // Only positive net contribution counts
      const userBasePoints = basePoints + netPoints;
      
      stats.basePoints = userBasePoints;
      totalBasePoints += userBasePoints;
      
      console.log(`👤 ${userAddress.slice(0, 8)}...`);
      console.log(`   Base TVL: ${stats.baseTVL.toFixed(2)} x 50% = ${basePoints.toFixed(2)} points`);
      if (stats.balanceBreakdown && Object.keys(stats.balanceBreakdown).length > 0) {
        for (const [market, breakdown] of Object.entries(stats.balanceBreakdown)) {
          console.log(`     ${market}: ${breakdown.sharePercentage.toFixed(4)}% of supply`);
        }
      }
      console.log(`   Net Contribution: $${stats.netContribution.toFixed(2)} x 50% = ${netPoints.toFixed(2)} points`);
      console.log(`   Total Base Points: ${userBasePoints.toFixed(2)}`);
      console.log('');
    }

    console.log(`🎯 Total Base Points Generated: ${totalBasePoints.toFixed(2)}`);

    // Step 2: Get invite multipliers for each user
    console.log('\n🔄 GETTING USER INVITE MULTIPLIERS...');
    console.log('====================================');

    for (const userAddress of users) {
      const stats = userStats[userAddress];
      const multiplier = await this.getUserMultiplier(userAddress, stats);
      stats.multiplier = multiplier;
      
      console.log(`👤 ${userAddress.slice(0, 8)}... → Multiplier: ${multiplier}x`);
    }

    // Step 3: Calculate total weighted points (base points × multiplier)
    let totalWeightedPoints = 0;
    
    console.log('\n⚖️  CALCULATING WEIGHTED POINTS...');
    console.log('==================================');

    for (const userAddress of users) {
      const stats = userStats[userAddress];
      const weightedPoints = stats.basePoints * stats.multiplier;
      totalWeightedPoints += weightedPoints;
      
      console.log(`👤 ${userAddress.slice(0, 8)}...`);
      console.log(`   ${stats.basePoints.toFixed(2)} points × ${stats.multiplier.toFixed(2)}x = ${weightedPoints.toFixed(2)} weighted points`);
    }

    console.log(`\n🎯 Total Weighted Points: ${totalWeightedPoints.toFixed(2)}`);
    console.log(`💰 Daily KILO Pool: ${this.dailyKiloDistribution.toLocaleString()} KILO`);

    // Step 4: Distribute KILO proportionally based on weighted points
    if (totalWeightedPoints > 0) {
      return this.distributeKilo(users, userStats, totalWeightedPoints);
    }

    return [];
  }

  distributeKilo(users, userStats, totalWeightedPoints) {
    console.log('\n💎 KILO DISTRIBUTION');
    console.log('====================');
    
    const distributions = [];
    
    for (const userAddress of users) {
      const stats = userStats[userAddress];
      const weightedPoints = stats.basePoints * stats.multiplier;
      const userShare = weightedPoints / totalWeightedPoints;
      const kiloReward = userShare * this.dailyKiloDistribution;
      
      stats.finalKilo = kiloReward;
      
      distributions.push({
        address: userAddress,
        baseTVL: stats.baseTVL,
        netContribution: stats.netContribution,
        basePoints: stats.basePoints,
        multiplier: stats.multiplier,
        weightedPoints: weightedPoints,
        share: userShare,
        kilo: kiloReward,
        balanceBreakdown: stats.balanceBreakdown || {}
      });
    }

    // Sort by KILO reward (highest first)
    distributions.sort((a, b) => b.kilo - a.kilo);

    for (let i = 0; i < distributions.length; i++) {
      const dist = distributions[i];
      const rank = i + 1;
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
      
      console.log(`${rankEmoji} #${rank} ${dist.address.slice(0, 8)}...`);
      console.log(`   Base TVL: ${dist.baseTVL.toFixed(2)} (from cToken balances)`);
      if (Object.keys(dist.balanceBreakdown).length > 0) {
        for (const [market, breakdown] of Object.entries(dist.balanceBreakdown)) {
          console.log(`     ${market}: ${breakdown.sharePercentage.toFixed(4)}%`);
        }
      }
      console.log(`   Net Contribution: $${dist.netContribution.toFixed(2)}`);
      console.log(`   Base Points: ${dist.basePoints.toFixed(2)}`);
      console.log(`   Multiplier: ${dist.multiplier}x`);
      console.log(`   Weighted Points: ${dist.weightedPoints.toFixed(2)}`);
      console.log(`   Share: ${(dist.share * 100).toFixed(2)}%`);
      console.log(`   🎁 KILO Reward: ${Math.floor(dist.kilo).toLocaleString()} KILO`);
      
      console.log('');
    }

    // Summary with example formula
    this.printDistributionFormula(distributions);

    return distributions;
  }

  printDistributionFormula(distributions) {
    console.log('📋 BALANCED DISTRIBUTION FORMULA EXAMPLE:');
    console.log('==========================================');
    console.log('💡 Base TVL = Sum of (cToken Balance / Total Supply) × 100 across markets');
    console.log('💡 Formula = (Base TVL × 50%) + (Net Contribution × 50%)');
    console.log('💡 This rewards both existing holders AND new contributors');
    console.log('');
    
    if (distributions.length >= 3) {
      const userA = distributions[0];
      const userB = distributions[1]; 
      const userC = distributions[2];
      
      console.log(`USER A = ${userA.baseTVL.toFixed(1)} TVL + $${userA.netContribution.toFixed(0)} net × ${userA.multiplier}x = ${userA.weightedPoints.toFixed(0)} weighted points`);
      console.log(`USER B = ${userB.baseTVL.toFixed(1)} TVL + $${userB.netContribution.toFixed(0)} net × ${userB.multiplier}x = ${userB.weightedPoints.toFixed(0)} weighted points`);
      console.log(`USER C = ${userC.baseTVL.toFixed(1)} TVL + $${userC.netContribution.toFixed(0)} net × ${userC.multiplier}x = ${userC.weightedPoints.toFixed(0)} weighted points`);
      console.log('');
      console.log('Then:');
      console.log(`USER A = ${Math.floor(userA.kilo).toLocaleString()} KILO`);
      console.log(`USER B = ${Math.floor(userB.kilo).toLocaleString()} KILO`);
      console.log(`USER C = ${Math.floor(userC.kilo).toLocaleString()} KILO`);
    } else if (distributions.length > 0) {
      // Show available users
      for (let i = 0; i < Math.min(distributions.length, 3); i++) {
        const user = distributions[i];
        const letter = String.fromCharCode(65 + i); // A, B, C
        console.log(`USER ${letter} = ${user.baseTVL.toFixed(1)} TVL + $${user.netContribution.toFixed(0)} net × ${user.multiplier}x = ${Math.floor(user.kilo).toLocaleString()} KILO`);
      }
    }
    
    console.log('');
    console.log('🎯 BALANCED SYSTEM BENEFITS:');
    console.log('• Early contributors get base TVL rewards from cToken holdings');
    console.log('• New contributors get rewards from net TVL contribution');
    console.log('• On quiet days, existing holders still earn KILO');
    console.log('• Encourages both holding and new activity');
  }
}

module.exports = KiloPointCalculator;