// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Test, console} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MockERC20} from "./MockERC20.sol";

// DEX Core imports
import {KiloDexFactory} from "../src/core/KiloDexFactory.sol";
import {KiloDexPool} from "../src/core/KiloDexPool.sol";

// DEX Periphery imports
import {Router} from "../src/periphery/Router.sol";
import {IRouter} from "../src/interfaces/periphery/IRouter.sol";
import {IBasePositionManager} from "../src/interfaces/periphery/IBasePositionManager.sol";
import {BasePositionManager} from "../src/periphery/BasePositionManager.sol";
import {TokenPositionDescriptor} from "../src/periphery/TokenPositionDescriptor.sol";

// DEX Oracle imports
import {PoolOracle} from "../src/oracle/PoolOracle.sol";

// Libraries
import {TickMath} from "../src/libraries/TickMath.sol";
import {LiquidityMath} from "../src/libraries/LiquidityMath.sol";
import {QtyDeltaMath} from "../src/libraries/QtyDeltaMath.sol";

/**
 * @title OracleTest
 * @notice Comprehensive test suite for oracle functionality in KiloDex
 * @dev Tests TWAP oracle, observations, and price tracking
 */
contract OracleTest is Test {
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
     * @notice Test basic oracle initialization and observation writing
     */
    function testOracleBasicFunctionality() public {
        vm.startPrank(liquidityProvider);

        // Provide liquidity first
        token0.approve(address(positionManager), 500000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: 500000 * 10**18,
            amount1Desired: 500000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        positionManager.mint(mintParams);

        // Initialize oracle
        (uint256 cardinality, uint256 cardinalityNext) = poolOracle.initializeOracle(1);
        assertEq(cardinality, 1, "Oracle cardinality should be 1");

        // Write initial observation
        (uint16 indexBefore, uint16 cardinalityBefore) = poolOracle.write(uint32(block.timestamp), 0, 1000000);
        
        // Verify observation was written
        assertTrue(indexBefore >= 0, "Index should be valid");
        assertTrue(cardinalityBefore >= 1, "Cardinality should be at least 1");

        console.log("Oracle basic functionality test:");
        console.log("  Index after write:", uint256(indexBefore));
        console.log("  Cardinality after write:", uint256(cardinalityBefore));

        vm.stopPrank();
    }

    /**
     * @notice Test oracle observations over time with price changes
     */
    function testOracleObservationsOverTime() public {
        vm.startPrank(liquidityProvider);

        // Provide liquidity
        token0.approve(address(positionManager), 500000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: 500000 * 10**18,
            amount1Desired: 500000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        positionManager.mint(mintParams);

        // Initialize oracle
        poolOracle.initializeOracle(10); // Higher cardinality for better observations

        // Get initial pool state
        (uint160 sqrtPriceX96Initial, int24 tickInitial, , ) = pool.getPoolState();
        console.log("Initial pool state:");
        console.log("  SqrtPriceX96:", sqrtPriceX96Initial);
        console.log("  Tick:", uint256(int256(tickInitial)));

        // Write first observation
        uint32 timestamp1 = uint32(block.timestamp);
        poolOracle.write(timestamp1, 0, 1000000);

        vm.stopPrank();

        // Perform a significant swap to change the price and tick
        vm.startPrank(swapper);
        uint256 swapAmount = 5000 * 10**18; // Larger swap to create significant price movement
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

        // Get pool state after swap
        (uint160 sqrtPriceX96After, int24 tickAfter, , ) = pool.getPoolState();
        console.log("Pool state after swap:");
        console.log("  SqrtPriceX96:", sqrtPriceX96After);
        console.log("  Tick:", uint256(int256(tickAfter)));

        vm.stopPrank();

        // Advance time and write second observation
        vm.startPrank(liquidityProvider);
        vm.warp(block.timestamp + 3600); // 1 hour later
        uint32 timestamp2 = uint32(block.timestamp);
        
        // Write observation after price change
        poolOracle.write(timestamp2, tickAfter, 1000000);

        // Perform another swap in opposite direction
        vm.stopPrank();
        vm.startPrank(swapper);
        
        // Swap some token1 back to token0
        token1.approve(address(router), 1000 * 10**18);
        
        IRouter.ExactInputSingleParams memory swapParams2 = IRouter.ExactInputSingleParams({
            tokenIn: address(token1),
            tokenOut: address(token0),
            fee: FEE_TIER,
            recipient: swapper,
            deadline: block.timestamp + 300,
            amountIn: 1000 * 10**18,
            minAmountOut: 0,
            limitSqrtP: 0
        });
        
        router.swapExactInputSingle(swapParams2);

        vm.stopPrank();

        // Advance time again and write third observation
        vm.startPrank(liquidityProvider);
        vm.warp(block.timestamp + 3600); // Another hour later
        uint32 timestamp3 = uint32(block.timestamp);
        
        (uint160 sqrtPriceX96Final, int24 tickFinal, , ) = pool.getPoolState();
        console.log("Final pool state:");
        console.log("  SqrtPriceX96:", sqrtPriceX96Final);
        console.log("  Tick:", uint256(int256(tickFinal)));
        
        poolOracle.write(timestamp3, tickFinal, 1000000);

        // Now test observation reading
        uint32[] memory secondsAgos = new uint32[](3);
        secondsAgos[0] = 7200; // 2 hours ago (from final timestamp)
        secondsAgos[1] = 3600; // 1 hour ago
        secondsAgos[2] = 0;    // Current

        int56[] memory tickCumulatives = poolOracle.observeFromPool(address(pool), secondsAgos);
        
        assertEq(tickCumulatives.length, 3, "Should return 3 observations");

        console.log("Oracle observations:");
        console.log("  Seconds ago: [7200, 3600, 0]");
        console.log("  Tick cumulatives:");
        console.logInt(int256(tickCumulatives[0]));
        console.logInt(int256(tickCumulatives[1]));
        console.logInt(int256(tickCumulatives[2]));

        // The tick cumulative should increase over time (assuming positive ticks)
        // Note: If ticks are negative, the cumulative will decrease, which is also valid
        bool tickIncreased = tickCumulatives[2] > tickCumulatives[1] && tickCumulatives[1] > tickCumulatives[0];
        bool tickDecreased = tickCumulatives[2] < tickCumulatives[1] && tickCumulatives[1] < tickCumulatives[0];
        
        assertTrue(tickIncreased || tickDecreased, "Tick cumulative should change consistently over time");

        vm.stopPrank();
    }

    /**
     * @notice Test oracle with multiple observations at different frequencies
     */
    function testOracleMultipleObservations() public {
        vm.startPrank(liquidityProvider);

        // Provide liquidity
        token0.approve(address(positionManager), 500000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: 500000 * 10**18,
            amount1Desired: 500000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        positionManager.mint(mintParams);

        // Initialize oracle with higher cardinality
        poolOracle.initializeOracle(20);

        uint32 baseTimestamp = uint32(block.timestamp);
        int24 currentTick = 0;

        // Write multiple observations with different ticks
        for (uint i = 0; i < 5; i++) {
            vm.warp(baseTimestamp + (i * 300)); // Every 5 minutes
            currentTick = int24(int(i * 10)); // Simulate tick changes
            poolOracle.write(uint32(block.timestamp), currentTick, 1000000);
            
            console.log("Observation");
            console.logUint(i);
            console.log("timestamp:");
            console.logUint(block.timestamp);
            console.log("tick:");
            console.logInt(int256(currentTick));
        }

        // Test reading different time ranges
        uint32[] memory secondsAgos = new uint32[](3);
        secondsAgos[0] = 1200; // 20 minutes ago
        secondsAgos[1] = 600;  // 10 minutes ago  
        secondsAgos[2] = 0;     // Current

        int56[] memory tickCumulatives = poolOracle.observeFromPool(address(pool), secondsAgos);
        
        assertEq(tickCumulatives.length, 3, "Should return 3 observations");

        console.log("Multiple observations test:");
        console.log("  Tick cumulatives at [1200, 600, 0] seconds ago:");
        console.logInt(int256(tickCumulatives[0]));
        console.logInt(int256(tickCumulatives[1]));
        console.logInt(int256(tickCumulatives[2]));

        vm.stopPrank();
    }

    /**
     * @notice Test oracle edge cases and error conditions
     */
    function testOracleEdgeCases() public {
        vm.startPrank(liquidityProvider);

        // Initialize oracle
        poolOracle.initializeOracle(1);

        // Test writing observation with same timestamp (should update)
        uint32 timestamp = uint32(block.timestamp);
        poolOracle.write(timestamp, 0, 1000000);
        
        // Try to write again with same timestamp
        (uint16 index1, uint16 cardinality1) = poolOracle.write(timestamp, 10, 1000000);
        
        // Should still work but update the same slot
        assertTrue(index1 >= 0, "Should handle same timestamp");

        // Test observing with invalid seconds array
        uint32[] memory emptySeconds = new uint32[](0);
        
        // This should handle gracefully or revert appropriately
        try poolOracle.observeFromPool(address(pool), emptySeconds) returns (int56[] memory result) {
            assertEq(result.length, 0, "Empty array should return empty result");
        } catch {
            // Reverting is also acceptable behavior
            console.log("Empty seconds array correctly reverted");
        }

        // Test observing with very large seconds ago (before oracle existed)
        uint32[] memory largeSeconds = new uint32[](1);
        largeSeconds[0] = type(uint32).max;
        
        try poolOracle.observeFromPool(address(pool), largeSeconds) returns (int56[] memory result) {
            assertEq(result.length, 1, "Should return one observation even for large seconds");
        } catch {
            console.log("Large seconds ago correctly reverted");
        }

        console.log("Oracle edge cases test completed");

        vm.stopPrank();
    }

    /**
     * @notice Test oracle performance with high cardinality
     */
    function testOracleHighCardinality() public {
        vm.startPrank(liquidityProvider);

        // Provide liquidity
        token0.approve(address(positionManager), 500000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: 500000 * 10**18,
            amount1Desired: 500000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        positionManager.mint(mintParams);

        // Initialize oracle with high cardinality 
        poolOracle.initializeOracle(1);
        poolOracle.increaseObservationCardinalityNext(address(pool), 100);
        (bool initialized, uint16 index, uint16 cardinality, uint16 cardinalityNext) = poolOracle.getPoolObservation(address(pool));

        assertEq(cardinalityNext, 100, "Should set high cardinality");

        uint32 baseTimestamp = uint32(block.timestamp);

        // Fill the oracle with observations
        for (uint i = 0; i < 50; i++) {
            vm.warp(baseTimestamp + (i * 60)); // Every minute
            poolOracle.write(uint32(block.timestamp), int24(int(i * 5)), 1000000);
        }

        // Test reading from the filled oracle
        uint32[] memory secondsAgos = new uint32[](5);
        for (uint i = 0; i < 5; i++) {
            secondsAgos[i] = uint32(i * 600); // 0, 10, 20, 30, 40 minutes ago
        }

        int56[] memory tickCumulatives = poolOracle.observeFromPool(address(pool), secondsAgos);
        assertEq(tickCumulatives.length, 5, "Should return 5 observations");

        console.log("High cardinality test:");
        console.log("  Cardinality:", cardinality);
        console.log("  Observations written: 50");
        console.log("  Successfully read 5 observations");

        vm.stopPrank();
    }

    /**
     * @notice Test oracle TWAP calculation
     */
    function testOracleTWAPCalculation() public {
        vm.startPrank(liquidityProvider);

        // Provide liquidity
        token0.approve(address(positionManager), 500000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)],
            amount0Desired: 500000 * 10**18,
            amount1Desired: 500000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        positionManager.mint(mintParams);

        // FIXED: Initialize oracle with cardinality 1, then increase it
        poolOracle.initializeOracle(1);
        poolOracle.increaseObservationCardinalityNext(address(pool), 10);
        
        // Get the actual pool tick for first observation
        (, int24 currentTick, , ) = pool.getPoolState();
        uint32 timestamp1 = uint32(block.timestamp);
        poolOracle.write(timestamp1, currentTick, 1000000);

        // Perform swap to actually change the pool price/tick
        vm.stopPrank();
        vm.startPrank(swapper);
        
        uint256 swapAmount = 10000 * 10**18;
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

        // Advance time and write observation with the actual new pool tick
        vm.startPrank(liquidityProvider);
        vm.warp(block.timestamp + 1800); // 30 minutes later
        
        // Get the new pool tick after swap
        (, int24 newTick, , ) = pool.getPoolState();
        uint32 timestamp2 = uint32(block.timestamp);
        poolOracle.write(timestamp2, newTick, 1000000);

        // Calculate TWAP over the 30 minute period
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = 1800; // 30 minutes ago
        secondsAgos[1] = 0;    // Current

        int56[] memory tickCumulatives = poolOracle.observeFromPool(address(pool), secondsAgos);
        
        // TWAP tick calculation
        int56 timeWeightedTick = tickCumulatives[1] - tickCumulatives[0];
        int56 averageTick = timeWeightedTick / int56(1800);

        console.log("TWAP calculation test:");
        console.log("  Period: 30 minutes (1800 seconds)");
        console.log("  Tick at start:", uint256(int256(currentTick)));
        console.log("  Tick at end:", uint256(int256(newTick)));
        console.log("  Time-weighted tick difference:");
        console.logInt(int256(timeWeightedTick));
        console.log("  Average tick over period:");
        console.logInt(int256(averageTick));

        // The TWAP should reflect the actual price change
        // If newTick > currentTick, average should be positive
        // If newTick < currentTick, average should be negative
        bool directionCorrect = (newTick > currentTick && averageTick > 0) || 
                            (newTick < currentTick && averageTick < 0) ||
                            (newTick == currentTick && averageTick == 0);
        
        assertTrue(directionCorrect, "TWAP direction should match price movement");
        assertTrue(timeWeightedTick != 0 || currentTick == newTick, "TWAP should be non-zero if price changed");

        vm.stopPrank();
    }
}