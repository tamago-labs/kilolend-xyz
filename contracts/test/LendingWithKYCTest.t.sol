// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../src/Morpho.sol";
import "../src/irm/JumpRateIrm.sol";
import "../src/PriceOracle.sol";
import "../src/mocks/ERC20Mock.sol";
import "../src/KYCRegistry.sol";
import "../src/libraries/MathLib.sol";
import "../src/libraries/SharesMathLib.sol";
import "../src/libraries/MarketParamsLib.sol";
import "../src/libraries/periphery/MorphoLib.sol";
import "../src/libraries/periphery/MorphoBalancesLib.sol";

/// @title LendingWithKYCTest
/// @notice Tests for the KYC-gated lending functionality in KiloLend
contract LendingWithKYCTest is Test {

    using MathLib for uint256;
    using SharesMathLib for uint256;
    using MorphoLib for IMorpho;
    using MorphoBalancesLib for IMorpho;
    using MarketParamsLib for MarketParams;

    uint256 constant BLOCK_TIME = 1;

    address OWNER;
    address FEE_RECIPIENT;
    address SUPPLIER;
    address BORROWER;
    address BORROWER_KYC_L1;
    address BORROWER_KYC_L2;
    address LIQUIDATOR;
    address UNVERIFIED_USER;

    IMorpho morpho;
    ERC20Mock usdt;
    ERC20Mock kub;
    KYCRegistry kycRegistry;

    JumpRateIrm kubIrm;
    PriceOracle kubOracle;

    MarketParams kubMarketParams;
    Id kubMarketId;

    // KUB = $0.85, USDT = $1
    uint256 constant KUB_USD = 85e16;
    uint256 constant USDT_USD = 1e18;

    function setUp() public {
        OWNER = makeAddr("Owner");
        FEE_RECIPIENT = makeAddr("FeeRecipient");
        SUPPLIER = makeAddr("Supplier");
        BORROWER = makeAddr("Borrower");
        BORROWER_KYC_L1 = makeAddr("BorrowerKYCL1");
        BORROWER_KYC_L2 = makeAddr("BorrowerKYCL2");
        LIQUIDATOR = makeAddr("Liquidator");
        UNVERIFIED_USER = makeAddr("UnverifiedUser");

        // Deploy Morpho
        morpho = IMorpho(address(new Morpho(OWNER)));

        // Deploy mock tokens
        usdt = new ERC20Mock();
        vm.label(address(usdt), "USDT");
        kub = new ERC20Mock();
        vm.label(address(kub), "KUB");

        // Deploy KYC Registry
        kycRegistry = new KYCRegistry(OWNER);

        // Deploy IRM
        kubIrm = new JumpRateIrm(0.02e18, 0.10e18, 2.00e18, 0.80e18);

        // Deploy Oracle
        kubOracle = new PriceOracle(address(usdt), address(kub), KUB_USD, USDT_USD, 18, 18);
        kubOracle.addToWhitelist(address(this));

        // Configure Morpho as owner
        vm.startPrank(OWNER);
        morpho.enableIrm(address(kubIrm));
        morpho.enableLltv(0.75e18); // 75% for KUB
        morpho.setFeeRecipient(FEE_RECIPIENT);
        morpho.setKYCRegistry(address(kycRegistry));
        vm.stopPrank();

        // Create KUB market
        kubMarketParams = MarketParams({
            loanToken: address(usdt),
            collateralToken: address(kub),
            oracle: address(kubOracle),
            irm: address(kubIrm),
            lltv: 0.75e18
        });
        kubMarketId = kubMarketParams.id();
        morpho.createMarket(kubMarketParams);

        _forward(1);

        // Approve Morpho for all users
        _approveAll(SUPPLIER);
        _approveAll(BORROWER);
        _approveAll(BORROWER_KYC_L1);
        _approveAll(BORROWER_KYC_L2);
        _approveAll(LIQUIDATOR);
        _approveAll(UNVERIFIED_USER);
        _approveAll(address(this));

        // Set KYC levels
        vm.startPrank(OWNER);
        kycRegistry.setKYCLevel(SUPPLIER, KYCLevel.L2);
        kycRegistry.setKYCLevel(BORROWER, KYCLevel.L2);
        kycRegistry.setKYCLevel(BORROWER_KYC_L1, KYCLevel.L1);
        kycRegistry.setKYCLevel(BORROWER_KYC_L2, KYCLevel.L2);
        kycRegistry.setKYCLevel(LIQUIDATOR, KYCLevel.L2);
        // UNVERIFIED_USER has no KYC (None)
        vm.stopPrank();

        // Set market to require L2 KYC
        vm.prank(OWNER);
        morpho.setMarketRequiredKYC(kubMarketParams, KYCLevel.L2);
    }

    function _approveAll(address user) internal {
        vm.startPrank(user);
        usdt.approve(address(morpho), type(uint256).max);
        kub.approve(address(morpho), type(uint256).max);
        vm.stopPrank();
    }

    function _forward(uint256 blocks) internal {
        vm.roll(block.number + blocks);
        vm.warp(block.timestamp + blocks * BLOCK_TIME);
    }

    // ============ KYC REGISTRY TESTS ============

    function test_kycRegistry_setKYCLevel() public view {
        assertEq(uint256(kycRegistry.kycLevelOf(SUPPLIER)), uint256(KYCLevel.L2));
        assertEq(uint256(kycRegistry.kycLevelOf(BORROWER)), uint256(KYCLevel.L2));
        assertEq(uint256(kycRegistry.kycLevelOf(BORROWER_KYC_L1)), uint256(KYCLevel.L1));
        assertEq(uint256(kycRegistry.kycLevelOf(UNVERIFIED_USER)), uint256(KYCLevel.None));
    }

    function test_kycRegistry_isKYCVerified() public {
        assertTrue(kycRegistry.isKYCVerified(SUPPLIER, KYCLevel.L2));
        assertTrue(kycRegistry.isKYCVerified(SUPPLIER, KYCLevel.L1));
        assertTrue(kycRegistry.isKYCVerified(SUPPLIER, KYCLevel.None));

        assertTrue(kycRegistry.isKYCVerified(BORROWER_KYC_L1, KYCLevel.L1));
        assertFalse(kycRegistry.isKYCVerified(BORROWER_KYC_L1, KYCLevel.L2));

        assertFalse(kycRegistry.isKYCVerified(UNVERIFIED_USER, KYCLevel.L1));
        assertTrue(kycRegistry.isKYCVerified(UNVERIFIED_USER, KYCLevel.None));
    }

    function test_kycRegistry_batchSetKYCLevel() public {
        address[] memory users = new address[](3);
        users[0] = makeAddr("batch1");
        users[1] = makeAddr("batch2");
        users[2] = makeAddr("batch3");

        vm.prank(OWNER);
        kycRegistry.batchSetKYCLevel(users, KYCLevel.L3);

        assertEq(uint256(kycRegistry.kycLevelOf(users[0])), uint256(KYCLevel.L3));
        assertEq(uint256(kycRegistry.kycLevelOf(users[1])), uint256(KYCLevel.L3));
        assertEq(uint256(kycRegistry.kycLevelOf(users[2])), uint256(KYCLevel.L3));
    }

    function test_kycRegistry_onlyOwnerCanSetLevel() public {
        vm.prank(UNVERIFIED_USER);
        vm.expectRevert("not owner");
        kycRegistry.setKYCLevel(UNVERIFIED_USER, KYCLevel.L2);
    }

    // ============ MORPHO KYC CONFIGURATION TESTS ============

    function test_setKYCRegistry_onlyOwner() public {
        KYCRegistry newRegistry = new KYCRegistry(OWNER);

        vm.prank(UNVERIFIED_USER);
        vm.expectRevert("not owner");
        morpho.setKYCRegistry(address(newRegistry));
    }

    function test_setMarketRequiredKYC_onlyOwner() public {
        vm.prank(UNVERIFIED_USER);
        vm.expectRevert("not owner");
        morpho.setMarketRequiredKYC(kubMarketParams, KYCLevel.L1);
    }

    function test_setKYCRegistry_revertsWhenSame() public {
        vm.prank(OWNER);
        vm.expectRevert();
        morpho.setKYCRegistry(address(kycRegistry));
    }

    function test_setMarketRequiredKYC_revertsWhenSame() public {
        vm.prank(OWNER);
        vm.expectRevert();
        morpho.setMarketRequiredKYC(kubMarketParams, KYCLevel.L2);
    }

    function test_marketRequiredKYC_isSet() public view {
        assertEq(uint256(morpho.marketRequiredKYC(kubMarketId)), uint256(KYCLevel.L2));
    }

    // ============ PERMISSIONED SUPPLY TESTS ============

    function test_supply_revertsForUnverifiedUser() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(UNVERIFIED_USER, supplyAmount);

        vm.prank(UNVERIFIED_USER);
        vm.expectRevert("insufficient KYC level");
        morpho.supply(kubMarketParams, supplyAmount, 0, UNVERIFIED_USER, hex"");
    }

    function test_supply_revertsForInsufficientKYCLevel() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(BORROWER_KYC_L1, supplyAmount);

        // Market requires L2, but user only has L1
        vm.prank(BORROWER_KYC_L1);
        vm.expectRevert("insufficient KYC level");
        morpho.supply(kubMarketParams, supplyAmount, 0, BORROWER_KYC_L1, hex"");
    }

    function test_supply_succeedsForKYCVerifiedUser() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);

        vm.prank(SUPPLIER);
        (uint256 suppliedAssets,) = morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");
        assertEq(suppliedAssets, supplyAmount);
    }

    // ============ PERMISSIONED SUPPLY COLLATERAL TESTS ============

    function test_supplyCollateral_revertsForUnverifiedUser() public {
        uint256 kubAmount = 100e18;
        kub.setBalance(UNVERIFIED_USER, kubAmount);

        vm.prank(UNVERIFIED_USER);
        vm.expectRevert("insufficient KYC level");
        morpho.supplyCollateral(kubMarketParams, kubAmount, UNVERIFIED_USER, hex"");
    }

    function test_supplyCollateral_succeedsForKYCVerifiedUser() public {
        // First supply some USDT for liquidity
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);

        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");
        assertEq(morpho.collateral(kubMarketId, BORROWER), kubAmount);
    }

    // ============ PERMISSIONED BORROW TESTS ============

    function test_borrow_revertsForUnverifiedUser() public {
        // Setup: supply USDT and collateral for BORROWER
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        // Borrow on behalf of UNVERIFIED_USER (as authorized)
        vm.prank(BORROWER);
        morpho.setAuthorization(UNVERIFIED_USER, true);

        vm.prank(UNVERIFIED_USER);
        vm.expectRevert("insufficient KYC level");
        morpho.borrow(kubMarketParams, 10e18, 0, UNVERIFIED_USER, UNVERIFIED_USER);
    }

    function test_borrow_succeedsForKYCVerifiedUser() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        (uint256 borrowedAssets,) = morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);
        assertEq(borrowedAssets, borrowAmount);
        assertEq(usdt.balanceOf(BORROWER), borrowAmount);
    }

    // ============ PERMISSIONED REPAY TESTS ============

    function test_repay_revertsForUnverifiedOnBehalf() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Try to repay on behalf of unverified user (reverts because onBehalf KYC check)
        usdt.setBalance(UNVERIFIED_USER, borrowAmount);
        vm.prank(UNVERIFIED_USER);
        vm.expectRevert("insufficient KYC level");
        morpho.repay(kubMarketParams, borrowAmount, 0, UNVERIFIED_USER, hex"");
    }

    function test_repay_succeedsForKYCVerifiedUser() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Repay as BORROWER (KYC verified)
        usdt.setBalance(BORROWER, borrowAmount);
        vm.prank(BORROWER);
        morpho.repay(kubMarketParams, borrowAmount, 0, BORROWER, hex"");

        assertEq(morpho.borrowShares(kubMarketId, BORROWER), 0, "borrow shares should be 0");
    }

    // ============ PERMISSIONED WITHDRAW TESTS ============

    function test_withdraw_revertsWhenKYCDowngraded() public {
        // Supply as L2 user
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(BORROWER, supplyAmount);
        vm.prank(BORROWER);
        morpho.supply(kubMarketParams, supplyAmount, 0, BORROWER, hex"");

        // Downgrade borrower KYC to L1 (market requires L2)
        vm.prank(OWNER);
        kycRegistry.setKYCLevel(BORROWER, KYCLevel.L1);

        // Now borrower cannot withdraw (onBehalf KYC check fails)
        vm.prank(BORROWER);
        vm.expectRevert("insufficient KYC level");
        morpho.withdraw(kubMarketParams, 5_000e18, 0, BORROWER, BORROWER);
    }

    function test_withdraw_succeedsForKYCVerifiedUser() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 withdrawAmount = 5_000e18;
        vm.prank(SUPPLIER);
        (uint256 withdrawn,) = morpho.withdraw(kubMarketParams, withdrawAmount, 0, SUPPLIER, SUPPLIER);
        assertEq(withdrawn, withdrawAmount);
    }

    // ============ PERMISSIONED WITHDRAW COLLATERAL TESTS ============

    function test_withdrawCollateral_revertsWhenKYCDowngraded() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        // Downgrade borrower KYC to L1 (market requires L2)
        vm.prank(OWNER);
        kycRegistry.setKYCLevel(BORROWER, KYCLevel.L1);

        // Now borrower cannot withdraw collateral (onBehalf KYC check fails)
        vm.prank(BORROWER);
        vm.expectRevert("insufficient KYC level");
        morpho.withdrawCollateral(kubMarketParams, 50e18, BORROWER, BORROWER);
    }

    function test_withdrawCollateral_succeedsForKYCVerifiedUser() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        // No borrow, so can withdraw
        uint256 withdrawAmount = 50e18;
        vm.prank(BORROWER);
        morpho.withdrawCollateral(kubMarketParams, withdrawAmount, BORROWER, BORROWER);
        assertEq(morpho.collateral(kubMarketId, BORROWER), kubAmount - withdrawAmount);
    }

    // ============ LIQUIDATION IS PERMISSIONLESS (NO KYC CHECK) ============

    function test_liquidation_succeedsForUnverifiedUser() public {
        // Supply USDT
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // Borrower deposits KUB and borrows near max
        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        uint256 borrowAmount = 60e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Drop KUB price from $0.85 to $0.50 → position becomes unhealthy
        vm.warp(block.timestamp + 1 hours);
        kubOracle.setPrice(5e17, USDT_USD);
        _forward(1);

        // Fund unverified user (liquidator) with USDT
        usdt.setBalance(UNVERIFIED_USER, 100e18);

        // Liquidation succeeds even for unverified user (no KYC check)
        uint256 seizeAmount = 10e18;
        vm.prank(UNVERIFIED_USER);
        (uint256 seized, uint256 repaid) =
            morpho.liquidate(kubMarketParams, BORROWER, seizeAmount, 0, hex"");
        assertEq(seized, seizeAmount, "seized amount mismatch");
        assertGt(repaid, 0, "should repay something");
        assertEq(kub.balanceOf(UNVERIFIED_USER), seizeAmount, "liquidator should get collateral");
    }

    // ============ FULL PERMISSIONED SUPPLY & BORROW FLOW ============

    function test_fullKYCPermissionedFlow() public {
        // 1. Market requires L2 KYC
        assertEq(uint256(morpho.marketRequiredKYC(kubMarketId)), uint256(KYCLevel.L2));

        // 2. L1 user cannot supply
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(BORROWER_KYC_L1, supplyAmount);
        vm.prank(BORROWER_KYC_L1);
        vm.expectRevert("insufficient KYC level");
        morpho.supply(kubMarketParams, supplyAmount, 0, BORROWER_KYC_L1, hex"");

        // 3. Upgrade L1 user to L2
        vm.prank(OWNER);
        kycRegistry.setKYCLevel(BORROWER_KYC_L1, KYCLevel.L2);

        // 4. Now L2 user can supply
        vm.prank(BORROWER_KYC_L1);
        (uint256 supplied,) = morpho.supply(kubMarketParams, supplyAmount, 0, BORROWER_KYC_L1, hex"");
        assertEq(supplied, supplyAmount);

        // 5. Another L2 user supplies collateral and borrows
        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        (uint256 borrowed,) = morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);
        assertEq(borrowed, borrowAmount);

        // 6. Repay the debt
        usdt.setBalance(BORROWER, borrowAmount);
        vm.prank(BORROWER);
        morpho.repay(kubMarketParams, borrowAmount, 0, BORROWER, hex"");
        assertEq(morpho.borrowShares(kubMarketId, BORROWER), 0);

        // 7. Withdraw collateral
        vm.prank(BORROWER);
        morpho.withdrawCollateral(kubMarketParams, kubAmount, BORROWER, BORROWER);
        assertEq(morpho.collateral(kubMarketId, BORROWER), 0);

        // 8. First user withdraws supply
        vm.prank(BORROWER_KYC_L1);
        (uint256 withdrawn,) = morpho.withdraw(kubMarketParams, supplyAmount, 0, BORROWER_KYC_L1, BORROWER_KYC_L1);
        assertEq(withdrawn, supplyAmount);
    }

    // ============ PERMISSIONLESS MARKET (KYC None) ============

    function test_permissionlessMarket_noKYCRequired() public {
        // Create a market with no KYC requirement
        vm.startPrank(OWNER);
        morpho.enableLltv(0.50e18);
        vm.stopPrank();

        PriceOracle permOracle = new PriceOracle(address(usdt), address(kub), KUB_USD, USDT_USD, 18, 18);
        permOracle.addToWhitelist(address(this));

        MarketParams memory permMarketParams = MarketParams({
            loanToken: address(usdt),
            collateralToken: address(kub),
            oracle: address(permOracle),
            irm: address(kubIrm),
            lltv: 0.50e18
        });
        morpho.createMarket(permMarketParams);

        // Market defaults to KYCLevel.None - unverified user can interact
        assertEq(uint256(morpho.marketRequiredKYC(permMarketParams.id())), uint256(KYCLevel.None));

        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(UNVERIFIED_USER, supplyAmount);

        vm.prank(UNVERIFIED_USER);
        (uint256 supplied,) = morpho.supply(permMarketParams, supplyAmount, 0, UNVERIFIED_USER, hex"");
        assertEq(supplied, supplyAmount);
    }

    // ============ KYC DOWNGRADE BLOCKS USER ============

    function test_kycDowngrade_blocksUserFromBorrowing() public {
        // Setup: L2 user borrows successfully
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubAmount = 100e18;
        kub.setBalance(BORROWER, kubAmount);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubAmount, BORROWER, hex"");

        // Borrower has L2, can borrow
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, 10e18, 0, BORROWER, BORROWER);

        // Downgrade borrower KYC to L1
        vm.prank(OWNER);
        kycRegistry.setKYCLevel(BORROWER, KYCLevel.L1);

        // Now borrower cannot borrow more
        vm.prank(BORROWER);
        vm.expectRevert("insufficient KYC level");
        morpho.borrow(kubMarketParams, 10e18, 0, BORROWER, BORROWER);

        // And cannot repay either (repay checks onBehalf KYC)
        usdt.setBalance(BORROWER, 10e18);
        vm.prank(BORROWER);
        vm.expectRevert("insufficient KYC level");
        morpho.repay(kubMarketParams, 10e18, 0, BORROWER, hex"");
    }
}