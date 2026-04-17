// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.10;

/**
 * @title LiquidityMath
 * @notice Library for liquidity calculations
 * @dev Provides functions for adding and subtracting liquidity
 */
library LiquidityMath {
    /**
     * @notice Add two liquidity values
     * @param x First liquidity value
     * @param y Second liquidity value
     * @return z Sum of x and y
     */
    function addDelta(uint128 x, int128 y) internal pure returns (uint128 z) {
        if (y < 0) {
            require((z = x - uint128(-y)) < x, 'LS');
        } else {
            z = x + uint128(y);
        }
    }
}