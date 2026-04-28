// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

import {IIrm} from "../interfaces/IIrm.sol";
import {MarketParams, Market} from "../interfaces/IMorpho.sol";
import {MathLib, WAD} from "../libraries/MathLib.sol";

/// @title JumpRateIrm
/// @notice A jump-rate interest rate model for Morpho Blue, ported from Compound V2's BaseJumpRateModelV2.
///         All parameters are immutable. To change rates, deploy a new IRM and create a new market.
contract JumpRateIrm is IIrm {
    using MathLib for uint256;

    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    uint256 public immutable BASE_RATE_PER_SECOND;
    uint256 public immutable MULTIPLIER_PER_SECOND;
    uint256 public immutable JUMP_MULTIPLIER_PER_SECOND;
    uint256 public immutable KINK;

    /// @param baseRatePerYear The base borrow rate per year (WAD). e.g. 0.02e18 for 2%.
    /// @param multiplierPerYear The slope of the rate curve below kink, per year (WAD).
    ///        This represents the rate at 100% utilization below kink, so it's divided by kink internally
    ///        to get the actual slope — matching Compound V2's BaseJumpRateModelV2 behavior.
    /// @param jumpMultiplierPerYear The jump multiplier per year above kink (WAD).
    /// @param kink The utilization point at which the jump multiplier applies (WAD). e.g. 0.80e18 for 80%.
    constructor(uint256 baseRatePerYear, uint256 multiplierPerYear, uint256 jumpMultiplierPerYear, uint256 kink) {
        require(kink > 0, "kink is zero");

        BASE_RATE_PER_SECOND = baseRatePerYear / SECONDS_PER_YEAR;
        // Normalize multiplier by kink, same as BaseJumpRateModelV2 line 136:
        //   multiplierPerBlock = (multiplierPerYear * BASE) / (blocksPerYear * kink_)
        MULTIPLIER_PER_SECOND = (multiplierPerYear * WAD) / (SECONDS_PER_YEAR * kink);
        JUMP_MULTIPLIER_PER_SECOND = jumpMultiplierPerYear / SECONDS_PER_YEAR;
        KINK = kink;
    }

    function borrowRate(MarketParams memory, Market memory market) external view returns (uint256) {
        return _borrowRate(market);
    }

    function borrowRateView(MarketParams memory, Market memory market) external view returns (uint256) {
        return _borrowRate(market);
    }

    function _borrowRate(Market memory market) internal view returns (uint256) {
        if (market.totalSupplyAssets == 0) return BASE_RATE_PER_SECOND;

        uint256 utilization = uint256(market.totalBorrowAssets).wDivDown(uint256(market.totalSupplyAssets));

        if (utilization <= KINK) {
            return utilization.wMulDown(MULTIPLIER_PER_SECOND) + BASE_RATE_PER_SECOND;
        } else {
            uint256 normalRate = KINK.wMulDown(MULTIPLIER_PER_SECOND) + BASE_RATE_PER_SECOND;
            uint256 excessUtil = utilization - KINK;
            return excessUtil.wMulDown(JUMP_MULTIPLIER_PER_SECOND) + normalRate;
        }
    }
}
