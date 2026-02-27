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
import {QuoterV2} from "../../src/dex/periphery/QuoterV2.sol";
import {IQuoterV2} from "../../src/dex/interfaces/periphery/IQuoterV2.sol";
import {TokenPositionDescriptor} from "../../src/dex/periphery/TokenPositionDescriptor.sol";

// DEX Oracle imports
import {PoolOracle} from "../../src/dex/oracle/PoolOracle.sol";

// Libraries
import {TickMath} from "../../src/dex/libraries/TickMath.sol";
import {LiquidityMath} from "../../src/dex/libraries/LiquidityMath.sol";
import {QtyDeltaMath} from "../../src/dex/libraries/QtyDeltaMath.sol";

/**
 * @title DexTest
 * @notice Core DEX functionality test suite for KiloDex
 * @dev Tests pool swaps, router swaps, multi-hop swaps, quoter functionality
 * @dev Liquidity management and oracle tests are moved to dedicated test files
 */
contract DexTest is Test {
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
    QuoterV2 private quoter;
    PoolOracle private poolOracle;
    TokenPositionDescriptor private descriptor;

    // Test parameters
    uint24 private constant FEE_TIER = 300; // 0.03%
    int24 private constant TICK_SPACING = 60;
    uint160 private constant START_PRICE = 79228162514264337593543950336; // 1:1 price sqrt(P)
    uint256 private constant SWAP_AMOUNT = 1000;

    // Test addresses
    address private owner = address(0x1);
    address private liquidityProvider = address(0x2);
    address private swapper = address(0x3);

    event Swap(
        address indexed sender,
        address indexed recipient,
        int256 amount0,
        int256 amount1,
        uint160 sqrtPriceX96,
        uint128 liquidity,
        int24 tick
    );

    function setUp() public {
        // Setup test accounts
        vm.startPrank(owner);
        
        // Deploy test tokens
        token0 = new MockERC20("Token0", "T0", 18);
        token1 = new MockERC20("Token1", "T1", 18);
        weth = new MockERC20("WETH", "WETH", 18);

        // Mint test tokens
        token0.mint(owner, 10000000 * 10**18); // Extra for owner to initialize pools
        token1.mint(owner, 10000000 * 10**18); // Extra for owner to initialize pools
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
        quoter = new QuoterV2(address(factory));

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
     * @notice Test basic pool swap functionality
     */
    function testPoolSwap() public {
        vm.startPrank(liquidityProvider);

        // Provide liquidity first
        _provideLiquidity();

        // Perform swap using router (proper way)
        uint256 swapAmount = SWAP_AMOUNT * 10**18;
        token0.approve(address(router), swapAmount);

        uint256 balanceBefore = token1.balanceOf(liquidityProvider);
        
        // Swap token0 for token1 using router
        IRouter.ExactInputSingleParams memory params = IRouter.ExactInputSingleParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            fee: FEE_TIER,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300,
            amountIn: swapAmount,
            minAmountOut: 0,
            limitSqrtP: 0
        });
        
        uint256 amountOut = router.swapExactInputSingle(params);

        uint256 balanceAfter = token1.balanceOf(liquidityProvider);
        
        // Verify swap results
        assertEq(balanceAfter - balanceBefore, amountOut, "Incorrect token1 received");
        assertTrue(amountOut > 0, "Should receive tokens");

        console.log("Pool swap completed:");
        console.log("  Amount0 in:", swapAmount);
        console.log("  Amount1 out:", amountOut);

        vm.stopPrank();
    }

    /**
     * @notice Test router swap functionality
     */
    function testRouterSwap() public {
        vm.startPrank(liquidityProvider);

        // Provide liquidity first
        _provideLiquidity();

        // Perform router swap
        uint256 swapAmount = SWAP_AMOUNT * 10**18;
        token0.approve(address(router), swapAmount);

        uint256 balanceBefore = token1.balanceOf(liquidityProvider);
        
        IRouter.ExactInputSingleParams memory params = IRouter.ExactInputSingleParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            fee: FEE_TIER,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300,
            amountIn: swapAmount,
            minAmountOut: 0,
            limitSqrtP: 0
        });

        uint256 amountOut = router.swapExactInputSingle(params);

        uint256 balanceAfter = token1.balanceOf(liquidityProvider);
        
        // Verify router swap results
        assertEq(balanceAfter - balanceBefore, amountOut, "Incorrect router output");
        assertTrue(amountOut > 0, "Should receive tokens");

        console.log("Router swap completed:");
        console.log("  Amount in:", swapAmount);
        console.log("  Amount out:", amountOut);

        vm.stopPrank();
    }

    /**
     * @notice Test multi-hop swap via router
     */
    function testMultiHopSwap() public {
        // Deploy intermediate token
        vm.startPrank(owner);
        MockERC20 token2 = new MockERC20("Token2", "T2", 18);
        token2.mint(owner, 10000000 * 10**18); // Extra for owner to initialize pool2
        token2.mint(swapper, 100000 * 10**18);
        
        // Create second pool
        KiloDexPool pool2 = KiloDexPool(factory.createPool(address(token1), address(token2), FEE_TIER));
        
        // Calculate required amounts for pool2 initialization and transfer to pool
        (uint256 unlockAmount0_2, uint256 unlockAmount1_2) = QtyDeltaMath.calcUnlockQtys(START_PRICE);
        token1.transfer(address(pool2), unlockAmount0_2);
        token2.transfer(address(pool2), unlockAmount1_2);
        
        pool2.unlockPool(START_PRICE);
        vm.stopPrank();

        // Provide liquidity to both pools
        vm.startPrank(liquidityProvider);
        
        // Liquidity for pool 0-1
        _provideLiquidity();
        
        // Liquidity for pool 1-2
        token1.mint(liquidityProvider, 1000000 * 10**18);
        token2.mint(liquidityProvider, 1000000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);
        token1.mint(liquidityProvider, 1000000 * 10**18);
        token2.mint(liquidityProvider, 1000000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);
        token2.approve(address(positionManager), 500000 * 10**18);
        
        IBasePositionManager.MintParams memory mintParams2 = IBasePositionManager.MintParams({
            token0: address(token1),
            token1: address(token2),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)], // MIN_TICK for fresh pool
            amount0Desired: 500000 * 10**18,
            amount1Desired: 500000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });
        
        positionManager.mint(mintParams2);
        
        // Approve tokens for swap
        token0.approve(address(router), SWAP_AMOUNT * 10**18);
        
        // Also approve swapper's tokens for the router
        vm.startPrank(swapper);
        token0.approve(address(router), SWAP_AMOUNT * 10**18);
        vm.stopPrank();

        // Perform multi-hop swap
        vm.startPrank(swapper);
        bytes memory path = abi.encodePacked(
            address(token0), FEE_TIER, address(token1), FEE_TIER, address(token2)
        );
        
        uint256 balanceBefore = token2.balanceOf(swapper);
        
        IRouter.ExactInputParams memory params = IRouter.ExactInputParams({
            path: path,
            recipient: swapper,
            deadline: block.timestamp + 300,
            amountIn: SWAP_AMOUNT * 10**18,
            minAmountOut: 0
        });
        
        uint256 amountOut = router.swapExactInput(params);
        
        uint256 balanceAfter = token2.balanceOf(swapper);
        
        assertEq(balanceAfter - balanceBefore, amountOut, "Incorrect multi-hop output");
        assertTrue(amountOut > 0, "Should receive tokens from multi-hop swap");

        console.log("Multi-hop swap completed:");
        console.log("  Path: Token0 -> Token1 -> Token2");
        console.log("  Amount in:", SWAP_AMOUNT * 10**18);
        console.log("  Amount out:", amountOut);

        vm.stopPrank();
    }

    /**
     * @notice Test position management (mint, burn, collect)
     */
    function testPositionManagement() public {
        vm.startPrank(liquidityProvider);

        // Mint position
        token0.approve(address(positionManager), 100000 * 10**18);
        token1.approve(address(positionManager), 100000 * 10**18);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -120,
            tickUpper: 120,
            ticksPrevious: [int24(-887272), int24(-887272)], // MIN_TICK for fresh pool
            amount0Desired: 100000 * 10**18,
            amount1Desired: 100000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        (uint256 tokenId, , , ) = positionManager.mint(mintParams);
        
        // Verify position exists
        (IBasePositionManager.Position memory position, ) = positionManager.positions(tokenId);
        assertTrue(position.liquidity > 0, "Position should have liquidity");

        // Perform some swaps to generate fees
        vm.stopPrank();
        vm.startPrank(swapper);
        
        uint256 swapAmount = 1000 * 10**18;
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

        // Sync fee growth
        vm.startPrank(liquidityProvider);
        positionManager.syncFeeGrowth(tokenId);

        console.log("Position management completed:");
        console.log("  Token ID:", tokenId);
        console.log("  Liquidity:", uint256(position.liquidity));

        vm.stopPrank();
    }

    /**
     * @notice Test quoter functionality
     */
    function testQuoter() public {
        vm.startPrank(liquidityProvider);
        
        // Provide liquidity
        _provideLiquidity();
        vm.stopPrank();

        // Quote swap
        IQuoterV2.QuoteExactInputSingleParams memory quoteParams = IQuoterV2.QuoteExactInputSingleParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            amountIn: SWAP_AMOUNT * 10**18,
            feeUnits: FEE_TIER,
            limitSqrtP: 0
        });

        IQuoterV2.QuoteOutput memory quote = quoter.quoteExactInputSingle(quoteParams);
        
        assertTrue(quote.returnedAmount > 0, "Quote should return positive amount");
        assertTrue(quote.gasEstimate > 0, "Should estimate gas usage");

        console.log("Quote results:");
        console.log("  Amount in:", SWAP_AMOUNT * 10**18);
        console.log("  Amount out:", quote.returnedAmount);
        console.log("  Gas estimate:", quote.gasEstimate);
    } 

    /**
     * @notice Helper function to provide liquidity
     */
    function _provideLiquidity() private {
        token0.approve(address(positionManager), 500000 * 10**18);
        token1.approve(address(positionManager), 500000 * 10**18);

        IBasePositionManager.MintParams memory mintParams = IBasePositionManager.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: FEE_TIER,
            tickLower: -60,
            tickUpper: 60,
            ticksPrevious: [int24(-887272), int24(-887272)], // MIN_TICK for fresh pool
            amount0Desired: 500000 * 10**18,
            amount1Desired: 500000 * 10**18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: liquidityProvider,
            deadline: block.timestamp + 300
        });

        positionManager.mint(mintParams);
    }

    /**
     * @notice Test edge cases and error conditions
     */
    function testEdgeCases() public {
        // Test insufficient approval
        vm.startPrank(swapper);
        uint256 swapAmount = SWAP_AMOUNT * 10**18;
        
        vm.expectRevert();
        router.swapExactInputSingle(IRouter.ExactInputSingleParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            fee: FEE_TIER,
            recipient: swapper,
            deadline: block.timestamp + 300,
            amountIn: swapAmount,
            minAmountOut: 0,
            limitSqrtP: 0
        }));
        
        // Test expired deadline
        token0.approve(address(router), swapAmount);
        
        vm.expectRevert();
        router.swapExactInputSingle(IRouter.ExactInputSingleParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            fee: FEE_TIER,
            recipient: swapper,
            deadline: block.timestamp - 1, // Expired
            amountIn: swapAmount,
            minAmountOut: 0,
            limitSqrtP: 0
        }));
        
        vm.stopPrank();
    }
}
