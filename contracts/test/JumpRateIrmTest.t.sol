// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../src/irm/JumpRateIrm.sol";
import "../src/interfaces/IMorpho.sol";
import "../src/libraries/MathLib.sol";

contract JumpRateIrmTest is Test {
    using MathLib for uint256;

    uint256 constant SECONDS_PER_YEAR = 365 days;

    JumpRateIrm irm;

    // CELO/stable config: base=2%, mult=10%, jump=200%, kink=80%
    uint256 constant BASE = 0.02e18;
    uint256 constant MULTIPLIER = 0.10e18;
    uint256 constant JUMP = 2.00e18;
    uint256 constant KINK = 0.80e18;

    function setUp() public {
        irm = new JumpRateIrm(BASE, MULTIPLIER, JUMP, KINK);
    }

    function _makeMarket(uint256 supply, uint256 borrows) internal pure returns (Market memory) {
        return Market({
            totalSupplyAssets: uint128(supply),
            totalSupplyShares: uint128(supply),
            totalBorrowAssets: uint128(borrows),
            totalBorrowShares: uint128(borrows),
            lastUpdate: 0,
            fee: 0
        });
    }

    function test_zeroSupply_returnsBaseRate() public view {
        Market memory m = _makeMarket(0, 0);
        uint256 rate = irm.borrowRateView(MarketParams(address(0), address(0), address(0), address(irm), 0), m);
        assertEq(rate, BASE / SECONDS_PER_YEAR, "zero supply should return base rate");
    }

    function test_zeroUtilization_returnsBaseRate() public view {
        Market memory m = _makeMarket(1e18, 0);
        uint256 rate = irm.borrowRateView(MarketParams(address(0), address(0), address(0), address(irm), 0), m);
        assertEq(rate, BASE / SECONDS_PER_YEAR, "0% util should return base rate");
    }

    function test_atKink() public view {
        uint256 supply = 1e18;
        uint256 borrows = 0.80e18; // 80% utilization = kink
        Market memory m = _makeMarket(supply, borrows);
        uint256 rate = irm.borrowRateView(MarketParams(address(0), address(0), address(0), address(irm), 0), m);

        // Expected: base + kink * (multiplier / kink) = base + multiplier
        // In per-second: base/sec + (multiplier * WAD) / (sec * kink) * kink / WAD = base/sec + multiplier/sec
        // But multiplier is normalized by kink at construction:
        //   MULTIPLIER_PER_SECOND = (MULTIPLIER * WAD) / (SECONDS_PER_YEAR * KINK)
        // So at kink: kink * MULTIPLIER_PER_SECOND / WAD = kink * (MULTIPLIER * WAD) / (SEC * KINK * WAD) = MULTIPLIER / SEC
        uint256 expectedNormalRate = BASE / SECONDS_PER_YEAR + MULTIPLIER / SECONDS_PER_YEAR;
        assertApproxEqAbs(rate, expectedNormalRate, 1, "rate at kink mismatch");
    }

    function test_aboveKink() public view {
        uint256 supply = 1e18;
        uint256 borrows = 0.90e18; // 90% utilization, above 80% kink
        Market memory m = _makeMarket(supply, borrows);
        uint256 rate = irm.borrowRateView(MarketParams(address(0), address(0), address(0), address(irm), 0), m);

        // normalRate = base/sec + kink * multiplierPerSec / WAD
        // excessUtil = 0.90 - 0.80 = 0.10
        // jumpRate = excessUtil * jumpMultiplierPerSec / WAD
        uint256 basePerSec = BASE / SECONDS_PER_YEAR;
        uint256 multiplierPerSec = (MULTIPLIER * 1e18) / (SECONDS_PER_YEAR * KINK);
        uint256 normalRate = KINK * multiplierPerSec / 1e18 + basePerSec;
        uint256 excessUtil = 0.10e18;
        uint256 jumpPerSec = JUMP / SECONDS_PER_YEAR;
        uint256 expectedRate = excessUtil * jumpPerSec / 1e18 + normalRate;

        assertApproxEqAbs(rate, expectedRate, 2, "rate above kink mismatch");
    }

    function test_fullUtilization() public view {
        uint256 supply = 1e18;
        uint256 borrows = 1e18; // 100% utilization
        Market memory m = _makeMarket(supply, borrows);
        uint256 rate = irm.borrowRateView(MarketParams(address(0), address(0), address(0), address(irm), 0), m);

        uint256 basePerSec = BASE / SECONDS_PER_YEAR;
        uint256 multiplierPerSec = (MULTIPLIER * 1e18) / (SECONDS_PER_YEAR * KINK);
        uint256 normalRate = KINK * multiplierPerSec / 1e18 + basePerSec;
        uint256 excessUtil = 1e18 - KINK; // 0.20e18
        uint256 jumpPerSec = JUMP / SECONDS_PER_YEAR;
        uint256 expectedRate = excessUtil * jumpPerSec / 1e18 + normalRate;

        assertApproxEqAbs(rate, expectedRate, 3, "rate at 100% mismatch");
    }

    function test_rateAlwaysPositive(uint256 utilizationBps) public view {
        utilizationBps = bound(utilizationBps, 0, 10000);
        uint256 supply = 1e18;
        uint256 borrows = supply * utilizationBps / 10000;
        Market memory m = _makeMarket(supply, borrows);
        uint256 rate = irm.borrowRateView(MarketParams(address(0), address(0), address(0), address(irm), 0), m);
        assertGe(rate, 0, "rate should be >= 0");
    }

    function test_rateBoundedReasonable(uint256 utilizationBps) public view {
        utilizationBps = bound(utilizationBps, 0, 10000);
        uint256 supply = 1e18;
        uint256 borrows = supply * utilizationBps / 10000;
        Market memory m = _makeMarket(supply, borrows);
        uint256 ratePerSec = irm.borrowRateView(MarketParams(address(0), address(0), address(0), address(irm), 0), m);

        // Rate should be < 1000% APR (extremely conservative upper bound)
        uint256 maxApr = 10e18; // 1000%
        uint256 maxPerSec = maxApr / SECONDS_PER_YEAR;
        assertLe(ratePerSec, maxPerSec, "rate exceeds 1000% APR");
    }
}
