// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Test, console} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MockERC20} from "./MockERC20.sol";

// DEX Core imports
import {KiloDexFactory} from "../../src/dex/core/KiloDexFactory.sol";
import {KiloDexPool} from "../../src/dex/core/KiloDexPool.sol";

// DEX Periphery imports
import {Router} from "../../src/dex/periphery/Router.sol";
import {IRouter} from "../../src/dex/interfaces/periphery/IRouter.sol";
import {IBasePositionManager} from "../../src/dex/interfaces/periphery/IBasePositionManager.sol";
import {BasePositionManager} from "../../src/dex/periphery/BasePositionManager.sol";
import {TokenPositionDescriptor} from "../../src/dex/periphery/TokenPositionDescriptor.sol";

// DEX Oracle imports
import {PoolOracle} from "../../src/dex/oracle/PoolOracle.sol";

// Libraries
import {TickMath} from "../../src/dex/libraries/TickMath.sol";
import {LiquidityMath} from "../../src/dex/libraries/LiquidityMath.sol";
import {QtyDeltaMath} from "../../src/dex/libraries/QtyDeltaMath.sol";

/**
 * @title LiquidityTest
 * @notice Comprehensive test suite for liquidity management in KiloDex
 * @dev Tests add liquidity, remove liquidity, and position management operations
 */
contract LiquidityTest is Test {
    using SafeERC20 for ERC20;

    // Test tokens
    MockERC20 private token0;
    MockERC20 private token1;
    MockERC20 private weth;

    // DEX contracts
    KiloDexFactory private factory;
    KiloDexPool private pool;
    Router private router;
    BasePositionManager private positionManager;
    PoolOracle private poolOracle;
    TokenPositionDescriptor private descriptor;

    // Test parameters
    uint24 private constant FEE_TIER = 300; // 0.03%
    int24 private constant TICK_SPACING = 60;
    uint160 private constant START_PRICE = 79228162514264337593543950336; // 1:1 price sqrt(P)

    // Test addresses
    address private owner = address(0x1);
    address private liquidityProvider = address(0x2);
    address private swapper = address(0x3);

    function setUp() public {
        // Setup test accounts
        vm.startPrank(owner);
        
        // Deploy test tokens
        token0 = new MockERC20("Token0", "T0", 18);
        token1 = new MockERC20("Token1", "T1", 18);
        weth = new MockERC20("WETH", "WETH", 18);

        // Mint test tokens
        token0.mint(owner, 10000000 * 10**18);
        token1.mint(owner, 10000000 * 10**18);
        token0.mint(liquidityProvider, 1000000 * 10**18);
        token1.mint(liquidityProvider, 1000000 * 10**18);
        token0.mint(swapper, 100000 * 10**18);
        token1.mint(swapper, 100000 * 10**18);

        // Deploy DEX contracts
        poolOracle = new PoolOracle();
        factory = new KiloDexFactory(30 days, address(poolOracle));
        
        descriptor = new TokenPositionDescriptor();
        positionManager = new BasePositionManager(
            address(factory),
            address(weth),
            address(descriptor)
        );
        
        // Whitelist the position manager
        factory.addNFTManager(address(positionManager));
        
        router = new Router(address(factory), address(weth));

        // Create pool
        pool = KiloDexPool(factory.createPool(address(token0), address(token1), FEE_TIER));

        // Calculate required amounts for pool initialization and transfer to pool
        (uint256 unlockAmount0, uint256 unlockAmount1) = QtyDeltaMath.calcUnlockQtys(START_PRICE);
        token0.transfer(address(pool), unlockAmount0);
        token1.transfer(address(pool), unlockAmount1);

        // Initialize pool
        pool.unlockPool(START_PRICE);

        vm.stopPrank();
    }

    /**
     * @notice Test adding liquidity with minting a new position
     */
    function testAddLiquidity() public {
        vm.startPrank(liquidityProvider);

        uint256 amount0Desired = 1000 * 10**18;
        uint256 amount1Desired = 1000 * 10**18;

        // Approve tokens to position manager
        token0.approve(address(positionManager), amount0Desired);
        token1.approve(address(positionManager), amount1Desired);

        uint256 balance0Before = token0.balanceOf(liquidityProvider);
        uint256 balance1Before = token1.balanceOf(liquidityProvider);

        // Mint new liquidity position
        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -120,
            tickUpper: 120,
            ticksPrevious: [int24(-887272), int24(-887272)], // MIN_TICK for fresh pool
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) = positionManager.mint(mintParams);

        uint256 balance0After = token0.balanceOf(liquidityProvider);
        uint256 balance1After = token1.balanceOf(liquidityProvider);

        // Verify position was created
        assertTrue(tokenId > 0, "Token ID should be greater than 0");
        assertTrue(liquidity > 0, "Liquidity should be greater than 0");
        assertTrue(amount0 > 0, "Amount0 should be greater than 0");
        assertTrue(amount1 > 0, "Amount1 should be greater than 0");

        // Verify tokens were deducted
        assertEq(balance0Before - balance0After, amount0, "Incorrect amount0 deducted");
        assertEq(balance1Before - balance1After, amount1, "Incorrect amount1 deducted");

        // Verify position details
        (IBasePositionManager.Position memory position, IBasePositionManager.PoolInfo memory info) = positionManager.positions(tokenId);
        assertEq(info.token0, address(token0), "Incorrect token0 in position");
        assertEq(info.token1, address(token1), "Incorrect token1 in position");
        assertEq(info.fee, FEE_TIER, "Incorrect fee in position");
        assertEq(position.tickLower, -120, "Incorrect tickLower");
        assertEq(position.tickUpper, 120, "Incorrect tickUpper");
        assertEq(position.liquidity, liquidity, "Incorrect liquidity in position");

        console.log("Add liquidity test completed:");
        console.log("  Token ID:", tokenId);
        console.log("  Liquidity:", uint256(liquidity));
        console.log("  Amount0 used:", amount0);
        console.log("  Amount1 used:", amount1);

        vm.stopPrank();
    }

    /**
     * @notice Test adding liquidity with different tick ranges
     */
    function testAddLiquidityDifferentRanges() public {
        vm.startPrank(liquidityProvider);

        uint256 amount0Desired = 500 * 10**18;
        uint256 amount1Desired = 500 * 10**18;

        // Test narrow range (concentrated liquidity)
        token0.approve(address(positionManager), amount0Desired);
        token1.approve(address(positionManager), amount1Desired);

        IBasePositionManager.MintParams memory narrowParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 narrowTokenId, uint128 narrowLiquidity,, ) = positionManager.mint(narrowParams);

        // Test wide range
        token0.approve(address(positionManager), amount0Desired);
        token1.approve(address(positionManager), amount1Desired);

        IBasePositionManager.MintParams memory wideParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -600,
            tickUpper: 600,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 wideTokenId, uint128 wideLiquidity,, ) = positionManager.mint(wideParams);

        // Verify both positions were created with different liquidity amounts
        assertTrue(narrowTokenId != wideTokenId, "Token IDs should be different");
        assertTrue(narrowLiquidity > 0, "Narrow position should have liquidity");
        assertTrue(wideLiquidity > 0, "Wide position should have liquidity");

        // Narrow range should have higher liquidity efficiency (more liquidity per token)
        console.log("Different ranges test completed:");
        console.log("  Narrow range liquidity:", uint256(narrowLiquidity));
        console.log("  Wide range liquidity:", uint256(wideLiquidity));

        vm.stopPrank();
    }

    /**
     * @notice Test removing liquidity by removing and burning a position
     */
    function testRemoveLiquidity() public {
        vm.startPrank(liquidityProvider);

        // First, add liquidity
        uint256 amount0Desired = 1000 * 10**18;
        uint256 amount1Desired = 1000 * 10**18;

        token0.approve(address(positionManager), amount0Desired);
        token1.approve(address(positionManager), amount1Desired);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -120,
            tickUpper: 120,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 tokenId, uint128 liquidity,, ) = positionManager.mint(mintParams);

        // Record balance after adding liquidity
        uint256 balance0Before = token0.balanceOf(liquidityProvider);
        uint256 balance1Before = token1.balanceOf(liquidityProvider);

        // Perform some swaps to generate fees
        vm.stopPrank();
        vm.startPrank(swapper);
        
        uint256 swapAmount = 100 * 10**18;
        token0.approve(address(router), swapAmount);
        
        IRouter.ExactInputSingleParams memory swapParams = IRouter.ExactInputSingleParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            fee: FEE_TIER,
            recipient: swapper,
            deadline: block.timestamp + 300,
            amountIn: swapAmount,
            minAmountOut: 0,
            limitSqrtP: 0
        });
        
        router.swapExactInputSingle(swapParams);
        vm.stopPrank();

        // Sync fee growth before removing
        vm.startPrank(liquidityProvider);
        positionManager.syncFeeGrowth(tokenId);

        // Now remove all liquidity
        IBasePositionManager.RemoveLiquidityParams memory removeParams = IBasePositionManager.RemoveLiquidityParams({
            tokenId: tokenId,
            liquidity: liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp + 300
        });

        (uint256 amount0Returned, uint256 amount1Returned, ) = positionManager.removeLiquidity(removeParams);

        // Transfer returned tokens from position manager to user
        positionManager.transferAllTokens(address(token0), 0, liquidityProvider);
        positionManager.transferAllTokens(address(token1), 0, liquidityProvider);

        uint256 balance0After = token0.balanceOf(liquidityProvider);
        uint256 balance1After = token1.balanceOf(liquidityProvider);

        // Verify tokens were returned
        assertTrue(amount0Returned > 0, "Should return amount0");
        assertTrue(amount1Returned > 0, "Should return amount1");
        assertEq(balance0After - balance0Before, amount0Returned, "Incorrect amount0 returned");
        assertEq(balance1After - balance1Before, amount1Returned, "Incorrect amount1 returned");

        // Burn rTokens first, then burn the position
        IBasePositionManager.BurnRTokenParams memory burnParams = IBasePositionManager.BurnRTokenParams({
            tokenId: tokenId,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp + 300
        });

        positionManager.burnRTokens(burnParams);
        positionManager.burn(tokenId);

        // Verify position was burned (liquidity should be 0)
        IBasePositionManager.Position memory position;
        (position, ) = positionManager.positions(tokenId);
        assertEq(position.liquidity, 0, "Position liquidity should be 0 after burning");

        console.log("Remove liquidity test completed:");
        console.log("  Amount0 returned:", amount0Returned);
        console.log("  Amount1 returned:", amount1Returned);
        console.log("  Original liquidity:", uint256(liquidity));

        vm.stopPrank();
    }

    /**
     * @notice Test partial liquidity removal
     */
    function testPartialRemoveLiquidity() public {
        vm.startPrank(liquidityProvider);

        // Add liquidity
        uint256 amount0Desired = 2000 * 10**18;
        uint256 amount1Desired = 2000 * 10**18;

        token0.approve(address(positionManager), amount0Desired);
        token1.approve(address(positionManager), amount1Desired);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -120,
            tickUpper: 120,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 tokenId, uint128 initialLiquidity,, ) = positionManager.mint(mintParams);

        // Get position after minting
        IBasePositionManager.Position memory position;
        (position, ) = positionManager.positions(tokenId);
        uint128 liquidityToRemove = position.liquidity / 2; // Remove half

        // Remove partial liquidity
        IBasePositionManager.RemoveLiquidityParams memory removeParams = IBasePositionManager.RemoveLiquidityParams({
            tokenId: tokenId,
            liquidity: liquidityToRemove,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp + 300
        });

        (uint256 amount0Returned, uint256 amount1Returned, ) = positionManager.removeLiquidity(removeParams);

        // Verify partial liquidity was removed
        assertTrue(amount0Returned > 0, "Should return amount0");
        assertTrue(amount1Returned > 0, "Should return amount1");

        // Check remaining liquidity
        IBasePositionManager.Position memory positionAfter;
        (positionAfter, ) = positionManager.positions(tokenId);
        assertEq(positionAfter.liquidity, initialLiquidity - liquidityToRemove, "Incorrect remaining liquidity");

        console.log("Partial remove liquidity test completed:");
        console.log("  Initial liquidity:", uint256(initialLiquidity));
        console.log("  Liquidity removed:", uint256(liquidityToRemove));
        console.log("  Liquidity remaining:", uint256(positionAfter.liquidity));
        console.log("  Amount0 returned:", amount0Returned);
        console.log("  Amount1 returned:", amount1Returned);

        vm.stopPrank();
    }

    /**
     * @notice Test collecting fees from a position
     */
    function testCollectFees() public {
        vm.startPrank(liquidityProvider);

        // Add liquidity
        uint256 amount0Desired = 1000 * 10**18;
        uint256 amount1Desired = 1000 * 10**18;

        token0.approve(address(positionManager), amount0Desired);
        token1.approve(address(positionManager), amount1Desired);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -120,
            tickUpper: 120,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 tokenId,,,) = positionManager.mint(mintParams);

        // Perform swaps to generate fees
        vm.stopPrank();
        vm.startPrank(swapper);
        
        uint256 swapAmount = 200 * 10**18;
        token0.approve(address(router), swapAmount);
        
        IRouter.ExactInputSingleParams memory swapParams = IRouter.ExactInputSingleParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            fee: FEE_TIER,
            recipient: swapper,
            deadline: block.timestamp + 300,
            amountIn: swapAmount,
            minAmountOut: 0,
            limitSqrtP: 0
        });
        
        router.swapExactInputSingle(swapParams);
        vm.stopPrank();

        // Sync fee growth and collect fees
        vm.startPrank(liquidityProvider);
        positionManager.syncFeeGrowth(tokenId);

        uint256 balance0Before = token0.balanceOf(liquidityProvider);
        uint256 balance1Before = token1.balanceOf(liquidityProvider);

        // Burn rTokens to collect fees
        IBasePositionManager.BurnRTokenParams memory burnParams = IBasePositionManager.BurnRTokenParams({
            tokenId: tokenId,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp + 300
        });

        (uint256 rTokenQty, uint256 amount0Collected, uint256 amount1Collected) = positionManager.burnRTokens(burnParams);

        // Transfer collected fees from position manager to user
        positionManager.transferAllTokens(address(token0), 0, liquidityProvider);
        positionManager.transferAllTokens(address(token1), 0, liquidityProvider);

        uint256 balance0After = token0.balanceOf(liquidityProvider);
        uint256 balance1After = token1.balanceOf(liquidityProvider);

        // Verify fees were collected
        assertEq(balance0After - balance0Before, amount0Collected, "Incorrect amount0 collected");
        assertEq(balance1After - balance1Before, amount1Collected, "Incorrect amount1 collected");

        console.log("Collect fees test completed:");
        console.log("  RToken qty burned:", rTokenQty);
        console.log("  Amount0 collected:", amount0Collected);
        console.log("  Amount1 collected:", amount1Collected);

        vm.stopPrank();
    }

    /**
     * @notice Test liquidity operations edge cases
     */
    function testLiquidityEdgeCases() public {
        vm.startPrank(liquidityProvider);

        // Test minimum liquidity amounts
        uint256 minAmount = 1 * 10**18;
        token0.approve(address(positionManager), minAmount);
        token1.approve(address(positionManager), minAmount);

        IBasePositionManager.MintParams memory minParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: minAmount,
            amount1Desired: minAmount,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 tokenId, uint128 liquidity,, ) = positionManager.mint(minParams);

        // Test burning with non-existent token (should fail)
        vm.expectRevert();
        positionManager.burn(tokenId + 1);

        console.log("Edge cases test completed successfully");

        vm.stopPrank();
    }
}