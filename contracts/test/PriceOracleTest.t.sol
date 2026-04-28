// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../src/PriceOracle.sol";


contract PriceOracleTest is Test {

    PriceOracle oracle;

    address loanToken = makeAddr("USDT");
    address collateralToken = makeAddr("KUB");
    address nonWhitelisted = makeAddr("stranger");
    address newUser = makeAddr("newUser");

    // Using 18 decimals for both tokens (mock tokens are 18 dec)
    uint8 constant LOAN_DEC = 18;
    uint8 constant COLL_DEC = 18;

    // KUB = $0.85, USDT = $1
    uint256 constant KUB_USD = 85e16; // 0.85 * 1e18
    uint256 constant USDT_USD = 1e18;

    event PriceUpdated(uint256 collateralUsdPrice, uint256 loanUsdPrice);
    event WhitelistUpdated(address indexed user, bool whitelisted);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event OracleModeSet(uint8 collateralMode, uint8 loanMode);
    event InvertModeSet(bool collateralInvert, bool loanInvert);
    event StalenessThresholdUpdated(uint256 newThreshold);

    function setUp() public {
        oracle = new PriceOracle(
            loanToken,
            collateralToken,
            KUB_USD,
            USDT_USD,
            LOAN_DEC,
            COLL_DEC
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // BASIC PRICE TESTS
    // ═══════════════════════════════════════════════════════════════════

    function test_price_basic() public view {
        // price = (KUB_USD / USDT_USD) * 10^(loanDec + 36 - collateralDec)
        // = (85e16 / 1e18) * 10^(18+36-18) = 0.85 * 1e36 = 85e34
        uint256 p = oracle.price();
        assertEq(p, 85e34, "KUB/USDT price mismatch");
    }

    function test_price_withDifferentDecimals() public {
        // Test with 6-decimal loan token (real USDT)
        address usdt6 = makeAddr("USDT6");
        PriceOracle oracle6 =
            new PriceOracle(usdt6, collateralToken, KUB_USD, USDT_USD, 6, 18);
        // price = (85e16 / 1e18) * 10^(6+36-18) = 0.85 * 1e24 = 85e22
        uint256 p = oracle6.price();
        assertEq(p, 85e22, "6/18 decimal price mismatch");
    }

    function test_price_equalPrices() public {
        // Both tokens = $1
        PriceOracle oracleEq =
            new PriceOracle(loanToken, collateralToken, 1e18, 1e18, 18, 18);
        // price = (1e18 / 1e18) * 10^36 = 1e36
        uint256 p = oracleEq.price();
        assertEq(p, 1e36, "Equal price should be 1e36");
    }

    function test_price_collateralMoreValuable() public {
        // Collateral = $3000 (ETH), Loan = $1 (USDT)
        PriceOracle oracleEth =
            new PriceOracle(loanToken, collateralToken, 3000e18, 1e18, 18, 18);
        // price = (3000e18 / 1e18) * 1e36 = 3000e36
        uint256 p = oracleEth.price();
        assertEq(p, 3000e36, "ETH/USDT price mismatch");
    }

    // ═══════════════════════════════════════════════════════════════════
    // INVERT MODE TESTS
    // ═══════════════════════════════════════════════════════════════════

    function test_invertCollateral() public {
        // Set up oracle with KUB = $0.85
        // Without invert: price = (85e16 / 1e18) * 1e36 = 85e34
        // With collateral invert: rawPrice becomes 1e36 / 85e16 = ~1.176e18
        // Then price = (1.176e18 / 1e18) * 1e36 = ~1.176e36
        oracle.setInvertMode(true, false);

        uint256 p = oracle.price();
        uint256 expectedCollUsd = 1e36 / KUB_USD; // inverted
        uint256 expected = (expectedCollUsd * 1e36) / USDT_USD;
        assertEq(p, expected, "Inverted collateral price mismatch");
    }

    function test_invertLoan() public {
        // With loan invert: rawLoanPrice becomes 1e36 / 1e18 = 1e18
        // price = (85e16 / 1e18) * 1e36 = 85e34 (same since 1/1 = 1)
        oracle.setInvertMode(false, true);

        uint256 p = oracle.price();
        uint256 expectedLoanUsd = 1e36 / USDT_USD; // = 1e18
        uint256 expected = (KUB_USD * 1e36) / expectedLoanUsd;
        assertEq(p, expected, "Inverted loan price mismatch");
    }

    function test_invertBoth() public {
        oracle.setInvertMode(true, true);

        uint256 p = oracle.price();
        uint256 expectedCollUsd = 1e36 / KUB_USD;
        uint256 expectedLoanUsd = 1e36 / USDT_USD;
        uint256 expected = (expectedCollUsd * 1e36) / expectedLoanUsd;
        assertEq(p, expected, "Both inverted price mismatch");
    }

    function test_invertMode_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setInvertMode(true, false);
    }

    function test_invertMode_event() public {
        vm.expectEmit(true, true, true, true);
        emit InvertModeSet(true, true);
        oracle.setInvertMode(true, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SET PRICE (FALLBACK MODE)
    // ═══════════════════════════════════════════════════════════════════

    function test_setPrice_onlyWhitelisted() public {
        vm.warp(block.timestamp + 2 hours);
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotWhitelisted.selector);
        oracle.setPrice(2e18, USDT_USD);
    }

    function test_setPrice_success() public {
        vm.warp(block.timestamp + 2 hours);
        oracle.setPrice(90e16, USDT_USD); // $0.90
        assertEq(oracle.collateralUsdPrice(), 90e16);
        assertEq(oracle.loanUsdPrice(), USDT_USD);
    }

    function test_setPrice_zeroReverts() public {
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(PriceOracle.ZeroPrice.selector);
        oracle.setPrice(0, USDT_USD);
    }

    function test_setPrice_zeroLoanReverts() public {
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(PriceOracle.ZeroPrice.selector);
        oracle.setPrice(KUB_USD, 0);
    }

    function test_setPrice_updateDelay() public {
        // Attempting to update immediately should fail
        vm.expectRevert(PriceOracle.UpdateTooFrequent.selector);
        oracle.setPrice(90e16, USDT_USD);
    }

    function test_setPrice_afterDelay() public {
        vm.warp(block.timestamp + 2 hours);
        oracle.setPrice(90e16, USDT_USD);
        assertEq(oracle.collateralUsdPrice(), 90e16);
    }

    function test_setPrice_event() public {
        vm.warp(block.timestamp + 2 hours);
        vm.expectEmit(true, true, true, true);
        emit PriceUpdated(90e16, USDT_USD);
        oracle.setPrice(90e16, USDT_USD);
    }

    // ═══════════════════════════════════════════════════════════════════
    // WHITELIST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_addToWhitelist() public {
        oracle.addToWhitelist(newUser);
        assertTrue(oracle.whitelist(newUser));
    }

    function test_removeFromWhitelist() public {
        oracle.addToWhitelist(newUser);
        oracle.removeFromWhitelist(newUser);
        assertFalse(oracle.whitelist(newUser));
    }

    function test_whitelist_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.addToWhitelist(newUser);
    }

    function test_removeWhitelist_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.removeFromWhitelist(newUser);
    }

    function test_whitelistedCanSetPrice() public {
        oracle.addToWhitelist(newUser);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(newUser);
        oracle.setPrice(90e16, USDT_USD);
        assertEq(oracle.collateralUsdPrice(), 90e16);
    }

    // ═══════════════════════════════════════════════════════════════════
    // OWNERSHIP
    // ═══════════════════════════════════════════════════════════════════

    function test_transferOwnership() public {
        address newOwner = makeAddr("newOwner");
        oracle.transferOwnership(newOwner);
        assertEq(oracle.owner(), newOwner);
    }

    function test_transferOwnership_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.transferOwnership(makeAddr("newOwner"));
    }

    function test_transferOwnership_event() public {
        address newOwner = makeAddr("newOwner");
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(address(this), newOwner);
        oracle.transferOwnership(newOwner);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ORACLE MODE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function test_initialOracleMode() public view {
        assertEq(oracle.collateralOracleMode(), 0);
        assertEq(oracle.loanOracleMode(), 0);
    }

    function test_setOracleMode() public {
        oracle.setOracleMode(1, 1);
        assertEq(oracle.collateralOracleMode(), 1);
        assertEq(oracle.loanOracleMode(), 1);
    }

    function test_setOracleMode_mixed() public {
        oracle.setOracleMode(1, 2);
        assertEq(oracle.collateralOracleMode(), 1);
        assertEq(oracle.loanOracleMode(), 2);
    }

    function test_setOracleMode_invalidMode() public {
        vm.expectRevert(PriceOracle.InvalidOracleMode.selector);
        oracle.setOracleMode(4, 0);
    }

    function test_setOracleMode_invalidModeLoan() public {
        vm.expectRevert(PriceOracle.InvalidOracleMode.selector);
        oracle.setOracleMode(0, 5);
    }

    function test_setOracleMode_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setOracleMode(1, 1);
    }

    function test_setOracleMode_event() public {
        vm.expectEmit(true, true, true, true);
        emit OracleModeSet(1, 2);
        oracle.setOracleMode(1, 2);
    }

    // ═══════════════════════════════════════════════════════════════════
    // STALENESS THRESHOLD
    // ═══════════════════════════════════════════════════════════════════

    function test_initialStalenessThreshold() public view {
        assertEq(oracle.stalenessThreshold(), 3600);
    }

    function test_setStalenessThreshold() public {
        oracle.setStalenessThreshold(7200);
        assertEq(oracle.stalenessThreshold(), 7200);
    }

    function test_setStalenessThreshold_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setStalenessThreshold(7200);
    }

    function test_setStalenessThreshold_zeroReverts() public {
        vm.expectRevert("Zero threshold");
        oracle.setStalenessThreshold(0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function test_getCollateralUsdPrice() public view {
        assertEq(oracle.getCollateralUsdPrice(), KUB_USD);
    }

    function test_getLoanUsdPrice() public view {
        assertEq(oracle.getLoanUsdPrice(), USDT_USD);
    }

    function test_getPriceInfo() public view {
        (uint8 collMode, uint8 lnMode, uint256 collUsd, uint256 lnUsd, uint256 morphoPrice) =
            oracle.getPriceInfo();
        assertEq(collMode, 0);
        assertEq(lnMode, 0);
        assertEq(collUsd, KUB_USD);
        assertEq(lnUsd, USDT_USD);
        assertEq(morphoPrice, 85e34);
    }

    // ═══════════════════════════════════════════════════════════════════
    // IMMUTABLES
    // ═══════════════════════════════════════════════════════════════════

    function test_immutables() public view {
        assertEq(oracle.LOAN_TOKEN(), loanToken);
        assertEq(oracle.COLLATERAL_TOKEN(), collateralToken);
        assertEq(oracle.LOAN_TOKEN_DECIMALS(), LOAN_DEC);
        assertEq(oracle.COLLATERAL_TOKEN_DECIMALS(), COLL_DEC);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PYTH / ORAKL / BKC CONFIG SETTERS (no live feeds, just config)
    // ═══════════════════════════════════════════════════════════════════

    function test_setPythFeed() public {
        bytes32 collFeed = keccak256("collFeed");
        bytes32 loanFeed = keccak256("loanFeed");
        oracle.setPythFeed(collFeed, loanFeed);
        assertEq(oracle.collateralPythFeedId(), collFeed);
        assertEq(oracle.loanPythFeedId(), loanFeed);
        assertEq(oracle.collateralOracleMode(), 1);
        assertEq(oracle.loanOracleMode(), 1);
    }

    function test_setPythFeed_zeroReverts() public {
        vm.expectRevert("Zero feed ID");
        oracle.setPythFeed(bytes32(0), keccak256("loan"));
    }

    function test_setPythFeed_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setPythFeed(keccak256("a"), keccak256("b"));
    }

    function test_setOraklFeed() public {
        oracle.setOraklFeed("BTC-USDT", "ETH-USDT");
        assertEq(oracle.collateralOraklFeed(), "BTC-USDT");
        assertEq(oracle.loanOraklFeed(), "ETH-USDT");
        assertEq(oracle.collateralOracleMode(), 2);
        assertEq(oracle.loanOracleMode(), 2);
    }

    function test_setOraklFeed_emptyReverts() public {
        vm.expectRevert("Empty feed name");
        oracle.setOraklFeed("BTC-USDT", "");
    }

    function test_setOraklFeed_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setOraklFeed("a", "b");
    }

    function test_setBkcFeed() public {
        address collAgg = makeAddr("collAgg");
        address loanAgg = makeAddr("loanAgg");
        oracle.setBkcFeed(collAgg, loanAgg);
        assertEq(oracle.collateralBkcAggregator(), collAgg);
        assertEq(oracle.loanBkcAggregator(), loanAgg);
        assertEq(oracle.collateralOracleMode(), 3);
        assertEq(oracle.loanOracleMode(), 3);
    }

    function test_setBkcFeed_zeroReverts() public {
        vm.expectRevert("Zero aggregator");
        oracle.setBkcFeed(address(0), makeAddr("agg"));
    }

    function test_setBkcFeed_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setBkcFeed(makeAddr("a"), makeAddr("b"));
    }

    function test_setPyth() public {
        address pythAddr = makeAddr("pyth");
        oracle.setPyth(pythAddr);
        assertEq(address(oracle.pyth()), pythAddr);
    }

    function test_setPyth_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setPyth(makeAddr("pyth"));
    }

    function test_setOraklRouter() public {
        address oraklAddr = makeAddr("orakl");
        oracle.setOraklRouter(oraklAddr);
        assertEq(address(oracle.oraklRouter()), oraklAddr);
    }

    function test_setOraklRouter_onlyOwner() public {
        vm.prank(nonWhitelisted);
        vm.expectRevert(PriceOracle.NotOwner.selector);
        oracle.setOraklRouter(makeAddr("orakl"));
    }

    // ═══════════════════════════════════════════════════════════════════
    // PYTH PRICE UPDATE HELPERS (revert without pyth contract set)
    // ═══════════════════════════════════════════════════════════════════

    function test_updatePythPrices_noPyth() public {
        bytes[] memory data = new bytes[](1);
        data[0] = bytes("test");
        vm.expectRevert(PriceOracle.OracleContractNotSet.selector);
        oracle.updatePythPrices{value: 0}(data);
    }

    function test_getUpdateFee_noPyth() public {
        bytes[] memory data = new bytes[](1);
        data[0] = bytes("test");
        vm.expectRevert(PriceOracle.OracleContractNotSet.selector);
        oracle.getUpdateFee(data);
    }
 
}