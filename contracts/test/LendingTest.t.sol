// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../src/Morpho.sol";
import "../src/irm/JumpRateIrm.sol";
import "../src/PriceOracle.sol";
import "../src/mocks/ERC20Mock.sol";
import "../src/libraries/MathLib.sol";
import "../src/libraries/SharesMathLib.sol";
import "../src/libraries/MarketParamsLib.sol";
import "../src/libraries/periphery/MorphoLib.sol";
import "../src/libraries/periphery/MorphoBalancesLib.sol";

contract LendingTest is Test {
     
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
    address LIQUIDATOR;

    IMorpho morpho;
    ERC20Mock usdt;
    ERC20Mock kilo;
    ERC20Mock kub;

    JumpRateIrm kiloIrm;
    JumpRateIrm kubIrm;
    PriceOracle kiloOracle;
    PriceOracle kubOracle;

    MarketParams kiloMarketParams;
    Id kiloMarketId;
    MarketParams kubMarketParams;
    Id kubMarketId;

    // All mock tokens are 18 decimals.
    // Prices: KILO = $0.01 (1e16), KUB = $0.85 (85e16), USDT = $1 (1e18)
    uint256 constant KILO_USD = 1e16;
    uint256 constant KUB_USD = 85e16;
    uint256 constant USDT_USD = 1e18;

    function setUp() public {
        OWNER = makeAddr("Owner");
        FEE_RECIPIENT = makeAddr("FeeRecipient");
        SUPPLIER = makeAddr("Supplier");
        BORROWER = makeAddr("Borrower");
        LIQUIDATOR = makeAddr("Liquidator");

        // Deploy Morpho
        morpho = IMorpho(address(new Morpho(OWNER)));

        // Deploy mock tokens (all 18 decimals)
        usdt = new ERC20Mock();
        vm.label(address(usdt), "USDT");
        kilo = new ERC20Mock();
        vm.label(address(kilo), "KILO");
        kub = new ERC20Mock();
        vm.label(address(kub), "KUB");

        // Deploy IRMs
        kiloIrm = new JumpRateIrm(0.02e18, 0.20e18, 3.00e18, 0.70e18);
        kubIrm = new JumpRateIrm(0.02e18, 0.10e18, 2.00e18, 0.80e18);

        // Deploy Oracles (all tokens 18 decimals)
        kiloOracle = new PriceOracle(address(usdt), address(kilo), KILO_USD, USDT_USD, 18, 18);
        kubOracle = new PriceOracle(address(usdt), address(kub), KUB_USD, USDT_USD, 18, 18);

        // Configure Morpho as owner
        vm.startPrank(OWNER);
        morpho.enableIrm(address(kiloIrm));
        morpho.enableIrm(address(kubIrm));
        morpho.enableLltv(0.15e18); // 15% for KILO
        morpho.enableLltv(0.75e18); // 75% for KUB
        morpho.setFeeRecipient(FEE_RECIPIENT);
        vm.stopPrank();

        // Add test contract to oracle whitelist for setPrice
        // Note: test contract is the oracle owner (set in constructor)
        kiloOracle.addToWhitelist(address(this));
        kubOracle.addToWhitelist(address(this));

        // Create markets
        kiloMarketParams = MarketParams({
            loanToken: address(usdt),
            collateralToken: address(kilo),
            oracle: address(kiloOracle),
            irm: address(kiloIrm),
            lltv: 0.15e18
        });
        kiloMarketId = kiloMarketParams.id();
        morpho.createMarket(kiloMarketParams);

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
        _approveAll(LIQUIDATOR);
        _approveAll(address(this));
    }

    function _approveAll(address user) internal {
        vm.startPrank(user);
        usdt.approve(address(morpho), type(uint256).max);
        kilo.approve(address(morpho), type(uint256).max);
        kub.approve(address(morpho), type(uint256).max);
        vm.stopPrank();
    }

    function _forward(uint256 blocks) internal {
        vm.roll(block.number + blocks);
        vm.warp(block.timestamp + blocks * BLOCK_TIME);
    }

    // ============ KILO MARKET TESTS ============

    function test_supplyAndBorrow_kiloMarket() public {
        // Supplier deposits 10,000 USDT
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        (uint256 suppliedAssets,) = morpho.supply(kiloMarketParams, supplyAmount, 0, SUPPLIER, hex"");
        assertEq(suppliedAssets, supplyAmount);

        // KILO price = $0.01, LLTV = 15%
        // 10,000 KILO ($100) collateral → maxBorrow = $100 * 0.15 = $15 = 15e18 raw USDT
        uint256 kiloCollateral = 10_000e18;
        kilo.setBalance(BORROWER, kiloCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kiloMarketParams, kiloCollateral, BORROWER, hex"");

        // Borrow 10 USDT (within $15 max)
        uint256 borrowAmount = 10e18;
        vm.prank(BORROWER);
        (uint256 borrowedAssets,) = morpho.borrow(kiloMarketParams, borrowAmount, 0, BORROWER, BORROWER);
        assertEq(borrowedAssets, borrowAmount);
        assertEq(usdt.balanceOf(BORROWER), borrowAmount);
    }

    function test_borrowExceedsLltv_reverts_kiloMarket() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kiloMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // 1,000 KILO ($10) → maxBorrow = $10 * 0.15 = $1.5
        uint256 kiloCollateral = 1_000e18;
        kilo.setBalance(BORROWER, kiloCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kiloMarketParams, kiloCollateral, BORROWER, hex"");

        // Try to borrow $10 (way over $1.5 max)
        vm.prank(BORROWER);
        vm.expectRevert("insufficient collateral");
        morpho.borrow(kiloMarketParams, 10e18, 0, BORROWER, BORROWER);
    }

    // ============ KUB MARKET TESTS ============

    function test_supplyAndBorrow_kubMarket() public {
        // Supplier deposits 10,000 USDT
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        (uint256 suppliedAssets,) = morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");
        assertEq(suppliedAssets, supplyAmount);

        // KUB price = $0.85, LLTV = 75%
        // 100 KUB ($85) → maxBorrow = $85 * 0.75 = $63.75
        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Borrow 50 USDT (within $63.75 max)
        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        (uint256 borrowedAssets,) = morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);
        assertEq(borrowedAssets, borrowAmount);
        assertEq(usdt.balanceOf(BORROWER), borrowAmount);
    }

    function test_borrowExceedsLltv_reverts_kubMarket() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // 100 KUB ($85) → maxBorrow = $63.75
        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Try to borrow $70 (over $63.75 max)
        vm.prank(BORROWER);
        vm.expectRevert("insufficient collateral");
        morpho.borrow(kubMarketParams, 70e18, 0, BORROWER, BORROWER);
    }

    // ============ REPAY TESTS ============

    function test_repayFullDebt() public {
        // Setup on KUB market
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Repay using shares (full repayment)
        uint256 borrowShares = morpho.borrowShares(kubMarketId, BORROWER);
        vm.prank(BORROWER);
        morpho.repay(kubMarketParams, 0, borrowShares, BORROWER, hex"");

        assertEq(morpho.borrowShares(kubMarketId, BORROWER), 0, "borrow shares should be 0");
    }

    // ============ WITHDRAW TESTS ============

    function test_withdraw_success() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // Withdraw half (no borrows, so all liquidity available)
        uint256 withdrawAmount = 5_000e18;
        uint256 balanceBefore = usdt.balanceOf(SUPPLIER);
        vm.prank(SUPPLIER);
        (uint256 withdrawn,) = morpho.withdraw(kubMarketParams, withdrawAmount, 0, SUPPLIER, SUPPLIER);
        assertEq(withdrawn, withdrawAmount);
        assertEq(usdt.balanceOf(SUPPLIER), balanceBefore + withdrawAmount);
    }

    function test_withdraw_revertsWhenInsufficientLiquidity() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Borrow $50 out of $10,000 supplied → only $9,950 available
        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Try to withdraw everything (only $9,950 available, not $10,000)
        vm.prank(SUPPLIER);
        vm.expectRevert("insufficient liquidity");
        morpho.withdraw(kubMarketParams, supplyAmount, 0, SUPPLIER, SUPPLIER);
    }

    // ============ INTEREST ACCRUAL TESTS ============

    function test_interestAccrual() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Forward 1 year
        _forward(365 days);

        // Accrue interest
        morpho.accrueInterest(kubMarketParams);

        // Total supply and borrow assets should have grown
        (uint256 totalSupplyAssets,, uint256 totalBorrowAssets,) =
            morpho.expectedMarketBalances(kubMarketParams);
        assertGt(totalSupplyAssets, supplyAmount, "supply should grow");
        assertGt(totalBorrowAssets, borrowAmount, "borrow should grow");
    }

    // ============ LIQUIDATION TESTS ============

    function test_liquidation_kubMarket() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // 100 KUB ($85), LLTV 75% → maxBorrow = $63.75
        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Borrow near max: $60
        uint256 borrowAmount = 60e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Drop KUB price from $0.85 to $0.50 (41% drop)
        vm.warp(block.timestamp + 1 hours);
        kubOracle.setPrice(5e17, USDT_USD); // $0.50 for KUB
        _forward(1);

        // Verify position is unhealthy: 100 * $0.50 * 0.75 = $37.50 max, but borrowed $60
        assertFalse(
            _isHealthy(kubMarketParams, kubMarketId, BORROWER), "position should be unhealthy"
        );

        // Liquidator seizes 10 KUB — fund liquidator with USDT for repayment
        usdt.setBalance(address(this), 100e18);
        uint256 seizeAmount = 10e18;
        (uint256 seized, uint256 repaid) =
            morpho.liquidate(kubMarketParams, BORROWER, seizeAmount, 0, hex"");
        assertEq(seized, seizeAmount, "seized amount mismatch");
        assertGt(repaid, 0, "should repay something");
        assertEq(kub.balanceOf(address(this)), seizeAmount, "liquidator should get collateral");
    }

    // ============ REDEEM / WITHDRAW COLLATERAL TESTS ============

    function test_withdrawCollateral_success() public {
        // Supplier deposits USDT
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // Borrower deposits KUB collateral
        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Borrower borrows small amount
        uint256 borrowAmount = 10e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Repay the debt
        usdt.setBalance(BORROWER, borrowAmount);
        vm.prank(BORROWER);
        morpho.repay(kubMarketParams, borrowAmount, 0, BORROWER, hex"");

        // Now withdraw half of collateral (no debt remaining)
        uint256 withdrawCollateralAmount = 50e18;
        uint256 balanceBefore = kub.balanceOf(BORROWER);
        vm.prank(BORROWER);
        morpho.withdrawCollateral(kubMarketParams, withdrawCollateralAmount, BORROWER, BORROWER);
        assertEq(kub.balanceOf(BORROWER), balanceBefore + withdrawCollateralAmount);
    }

    function test_withdrawCollateral_revertsWhenInsufficientBalance() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Try to withdraw more than deposited
        vm.prank(BORROWER);
        vm.expectRevert();
        morpho.withdrawCollateral(kubMarketParams, 200e18, BORROWER, BORROWER);
    }

    // ============ HEALTH CHECK TESTS ============

    function test_healthyPosition() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // 100 KUB ($85), LLTV 75% → maxBorrow = $63.75
        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Borrow $50 (within $63.75 max) - should be healthy
        uint256 borrowAmount = 50e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        assertTrue(_isHealthy(kubMarketParams, kubMarketId, BORROWER), "position should be healthy");
    }

    function test_unhealthyPosition_afterPriceDrop() public {
        uint256 supplyAmount = 10_000e18;
        usdt.setBalance(SUPPLIER, supplyAmount);
        vm.prank(SUPPLIER);
        morpho.supply(kubMarketParams, supplyAmount, 0, SUPPLIER, hex"");

        // 100 KUB ($85), LLTV 75% → maxBorrow = $63.75
        uint256 kubCollateral = 100e18;
        kub.setBalance(BORROWER, kubCollateral);
        vm.prank(BORROWER);
        morpho.supplyCollateral(kubMarketParams, kubCollateral, BORROWER, hex"");

        // Borrow $60 (within $63.75 max initially)
        uint256 borrowAmount = 60e18;
        vm.prank(BORROWER);
        morpho.borrow(kubMarketParams, borrowAmount, 0, BORROWER, BORROWER);

        // Position is healthy at $0.85 price
        assertTrue(_isHealthy(kubMarketParams, kubMarketId, BORROWER), "position should be healthy at $0.85");

        // Drop KUB price to $0.50
        // Position becomes unhealthy: 100 * $0.50 * 0.75 = $37.50 max, but borrowed $60
        vm.warp(block.timestamp + 1 hours);
        kubOracle.setPrice(5e17, USDT_USD); // $0.50 for KUB
        _forward(1);

        assertFalse(_isHealthy(kubMarketParams, kubMarketId, BORROWER), "position should be unhealthy at $0.50");
    }

    // ============ HELPERS ============

    function _isHealthy(MarketParams memory mp, Id id, address user) internal view returns (bool) {
        if (morpho.borrowShares(id, user) == 0) return true;
        uint256 collateralPrice = PriceOracle(mp.oracle).price();
        uint256 borrowed = uint256(morpho.borrowShares(id, user)).toAssetsUp(
            morpho.totalBorrowAssets(id), morpho.totalBorrowShares(id)
        );
        uint256 maxBorrow =
            uint256(morpho.collateral(id, user)).mulDivDown(collateralPrice, ORACLE_PRICE_SCALE).wMulDown(mp.lltv);
        return maxBorrow >= borrowed;
    }
}