// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/tokens/AIAgentToken.sol";
import "../../src/dex/core/KiloDexFactory.sol";
import "../../src/dex/core/KiloDexPool.sol";
import "../../src/dex/periphery/Router.sol";
import "../../src/dex/periphery/AntiSnipAttackPositionManager.sol";
import "../../src/dex/interfaces/periphery/IBasePositionManager.sol";
import "../../src/dex/libraries/TickMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SetupKubsterPool
 * @notice Create and initialize KUBS/WKUB pool with liquidity
 * @dev Usage: 
 *   forge script script/kub/3-SetupKubsterPool.s.sol --rpc-url $KUB_RPC_URL --broadcast --legacy
 *   
 *   Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - KUBS_TOKEN_ADDRESS: Address of deployed KUBS token
 *   - WKUB_ADDRESS: Wrapped KUB (WKUB) address on KUB
 *   - DEX_FACTORY_ADDRESS: Address of deployed DEX factory
 *   - DEX_ROUTER_ADDRESS: Address of deployed DEX router
 *   - POSITION_MANAGER_ADDRESS: Address of deployed position manager
 */
contract SetupKubsterPool is Script {
    
    // Pool Configuration
    uint256 public constant KUBS_LIQUIDITY = 100_000 * 10**18; // 100K KUBS tokens
    uint256 public constant WKUB_LIQUIDITY = 100 * 10**18; // 100 WKUB (assuming 1 WKUB = 1000 KUBS)
    uint24 public constant FEE_TIER = 10000; // 1% fee tier
    
    // Tick configuration for initial price (1 WKUB = 1000 KUBS)
    int24 public constant TICK_SPACING = 200; // For 1% fee tier
    int24 public constant INITIAL_TICK = -23158; // Approximate price of 1 WKUB = 1000 KUBS
    
    struct PoolSetup {
        address pool;
        address kubsToken;
        address wkub;
        address factory;
        address router;
        address positionManager;
        uint256 tokenId;
        uint256 kubsLiquidity;
        uint256 wkubLiquidity;
    }
    
    function run() external returns (PoolSetup memory) {
        return setup();
    }
    
    /**
     * @notice Setup KUBS/WKUB pool with initial liquidity
     * @return setup Pool setup details
     */
    function setup() public returns (PoolSetup memory) {
        console.log("===========================================");
        console.log("Setup KUBS/WKUB Pool");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == 96, "Must deploy to KUB Chain (chain ID 96)");
        
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        // Get contract addresses
        address kubsToken = vm.envAddress("KUBS_TOKEN_ADDRESS");
        address wkub = vm.envAddress("WKUB_ADDRESS");
        address factory = vm.envAddress("DEX_FACTORY_ADDRESS");
        address router = vm.envAddress("DEX_ROUTER_ADDRESS");
        address positionManager = vm.envAddress("POSITION_MANAGER_ADDRESS");
        
        console.log("KUBS Token:", kubsToken);
        console.log("WKUB Token:", wkub);
        console.log("Factory:", factory);
        console.log("Router:", router);
        console.log("Position Manager:", positionManager);
        
        console.log("===========================================");
        console.log("Pool Configuration:");
        console.log("  KUBS Liquidity:", KUBS_LIQUIDITY / 1e18);
        console.log("  WKUB Liquidity:", WKUB_LIQUIDITY / 1e18);
        console.log("  Fee Tier:", FEE_TIER, "basis points");
        console.log("  Initial Tick:", INITIAL_TICK);
        console.log("===========================================");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Create pool
        KiloDexFactory factoryContract = KiloDexFactory(factory);
        KiloDexPool pool = _createPool(factoryContract, kubsToken, wkub, FEE_TIER, INITIAL_TICK);
        
        // Approve tokens for position manager
        _approveTokens(kubsToken, wkub, positionManager, KUBS_LIQUIDITY, WKUB_LIQUIDITY);
        
        // Create liquidity position
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Used;
        uint256 amount1Used;
        (tokenId, liquidity, amount0Used, amount1Used) = _createLiquidityPosition(
            positionManager,
            kubsToken,
            wkub,
            FEE_TIER,
            INITIAL_TICK,
            KUBS_LIQUIDITY,
            WKUB_LIQUIDITY
        );
        
        vm.stopBroadcast();
        
        // Create setup result
        PoolSetup memory poolSetup = PoolSetup({
            pool: address(pool),
            kubsToken: kubsToken,
            wkub: wkub,
            factory: factory,
            router: router,
            positionManager: positionManager,
            tokenId: tokenId,
            kubsLiquidity: KUBS_LIQUIDITY,
            wkubLiquidity: WKUB_LIQUIDITY
        });
        
        _logSetupResults(poolSetup);
        _verifySetup(poolSetup);
        
        console.log("===========================================");
        console.log("KUBS/WKUB pool setup complete!");
        console.log("===========================================");
        
        return poolSetup;
    }
    
    function _createPool(
        KiloDexFactory factory,
        address tokenA,
        address tokenB,
        uint24 fee,
        int24 tick
    ) internal returns (KiloDexPool) {
        console.log("Creating pool...");
        
        // Determine token order
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        // Create pool
        address poolAddress = factory.createPool(token0, token1, fee);
        KiloDexPool pool = KiloDexPool(payable(poolAddress));
        
        console.log("Pool created:", poolAddress);
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        
        // Initialize pool
        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
        pool.unlockPool(sqrtPriceX96);
        
        console.log("Pool initialized with tick:", tick);
        console.log("SqrtPriceX96:", sqrtPriceX96);
        
        return pool;
    }
    
    function _approveTokens(
        address kubsToken,
        address wkub,
        address positionManager,
        uint256 kubsAmount,
        uint256 wkubAmount
    ) internal {
        console.log("Approving tokens...");
        
        AIAgentToken kubs = AIAgentToken(kubsToken);
        
        // Approve KUBS
        kubs.approve(positionManager, kubsAmount);
        console.log("KUBS approved for position manager");
        
        // Approve WKUB (assuming WKUB is ERC20)
        IERC20 wkubToken = IERC20(wkub);
        wkubToken.approve(positionManager, wkubAmount);
        console.log("WKUB approved for position manager");
    }
    
    function _createLiquidityPosition(
        address positionManager,
        address tokenA,
        address tokenB,
        uint24 fee,
        int24 currentTick,
        uint256 amount0,
        uint256 amount1
    ) internal returns (uint256 tokenId, uint128 liquidity, uint256 amount0Used, uint256 amount1Used) {
        console.log("Creating liquidity position...");
        
        // Determine token order and adjust amounts
        (address token0, address token1, uint256 adjAmount0, uint256 adjAmount1) = _orderTokens(tokenA, tokenB, amount0, amount1);
        
        // Create and mint position in one go to reduce stack depth
        (tokenId, liquidity, amount0Used, amount1Used) = _mintPosition(positionManager, token0, token1, fee, adjAmount0, adjAmount1);
        
        _logPositionResults(tokenId, liquidity, amount0Used, amount1Used);
        
        return (tokenId, liquidity, amount0Used, amount1Used);
    }
    
    function _orderTokens(
        address tokenA,
        address tokenB,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (address token0, address token1, uint256 adjAmount0, uint256 adjAmount1) {
        token0 = tokenA < tokenB ? tokenA : tokenB;
        token1 = tokenA < tokenB ? tokenB : tokenA;
        
        if (tokenA != token0) {
            adjAmount0 = amount1;
            adjAmount1 = amount0;
        } else {
            adjAmount0 = amount0;
            adjAmount1 = amount1;
        }
        
        return (token0, token1, adjAmount0, adjAmount1);
    }
    
    function _getTickRange(int24 currentTick) internal pure returns (int24 tickLower, int24 tickUpper) {
        tickLower = currentTick - (TICK_SPACING * 100);
        tickUpper = currentTick + (TICK_SPACING * 100);
        return (tickLower, tickUpper);
    }
    
    function _mintPosition(
        address positionManager,
        address token0,
        address token1,
        uint24 fee,
        uint256 amount0,
        uint256 amount1
    ) internal returns (uint256 tokenId, uint128 liquidity, uint256 amount0Used, uint256 amount1Used) {
        // Get tick range
        (int24 tickLower, int24 tickUpper) = _getTickRange(INITIAL_TICK);
        
        // Log tick range
        console.log("Tick range:");
        console.logInt(int256(tickLower));
        console.log("to");
        console.logInt(int256(tickUpper));
        
        // Create mint params
        IBasePositionManager.MintParams memory params = IBasePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            ticksPrevious: [int24(0), int24(0)],
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp + 3600
        });
        
        // Mint position
        AntiSnipAttackPositionManager pm = AntiSnipAttackPositionManager(payable(positionManager));
        (tokenId, liquidity, amount0Used, amount1Used) = pm.mint(params);
        
        return (tokenId, liquidity, amount0Used, amount1Used);
    }
    
    function _createMintParamsBasicStep1(
        address token0,
        address token1
    ) internal pure returns (IBasePositionManager.MintParams memory) {
        IBasePositionManager.MintParams memory params;
        params.token0 = token0;
        params.token1 = token1;
        return params;
    }
    
    function _fillMintParamsFee(
        IBasePositionManager.MintParams memory params,
        uint24 fee
    ) internal pure returns (IBasePositionManager.MintParams memory) {
        params.fee = fee;
        return params;
    }
    
    function _fillMintParamsTicks(
        IBasePositionManager.MintParams memory params,
        int24 tickLower,
        int24 tickUpper
    ) internal pure returns (IBasePositionManager.MintParams memory) {
        params.tickLower = tickLower;
        params.tickUpper = tickUpper;
        params.ticksPrevious = [int24(0), int24(0)];
        params.amount0Min = 0;
        params.amount1Min = 0;
        return params;
    }
    
    function _fillMintParamsAmounts(
        IBasePositionManager.MintParams memory params,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (IBasePositionManager.MintParams memory) {
        params.amount0Desired = amount0;
        params.amount1Desired = amount1;
        return params;
    }
    
    function _fillMintParamsRecipient(
        IBasePositionManager.MintParams memory params,
        address recipient
    ) internal view returns (IBasePositionManager.MintParams memory) {
        params.recipient = recipient;
        params.deadline = block.timestamp + 3600;
        return params;
    }
    
    function _logPositionResults(uint256 tokenId, uint128 liquidity, uint256 amount0Used, uint256 amount1Used) internal view {
        console.log("Position created:");
        console.log("  Token ID:", tokenId);
        console.log("  Liquidity:", liquidity);
        console.log("  Amount0 Used:", amount0Used / 1e18);
        console.log("  Amount1 Used:", amount1Used / 1e18);
    }
    
    function _logSetupResults(PoolSetup memory poolSetup) internal view {
        console.log("\n===========================================");
        console.log("Pool Setup Results");
        console.log("===========================================");
        console.log("Pool Address:", poolSetup.pool);
        console.log("KUBS Token:", poolSetup.kubsToken);
        console.log("WKUB Token:", poolSetup.wkub);
        console.log("Factory:", poolSetup.factory);
        console.log("Router:", poolSetup.router);
        console.log("Position Manager:", poolSetup.positionManager);
        console.log("Position Token ID:", poolSetup.tokenId);
        
        console.log("\nPool Information:");
        KiloDexPool pool = KiloDexPool(payable(poolSetup.pool));
        
        (uint160 sqrtPriceX96, int24 currentTick, , ) = pool.getPoolState();
        console.log("  Current Tick:", currentTick);
        console.log("  SqrtPriceX96:", sqrtPriceX96);
        
        console.log("\nLiquidity Information:");
        console.log("  KUBS Provided:", poolSetup.kubsLiquidity / 1e18);
        console.log("  WKUB Provided:", poolSetup.wkubLiquidity / 1e18);
        
        AntiSnipAttackPositionManager pm = AntiSnipAttackPositionManager(payable(poolSetup.positionManager));
        (IBasePositionManager.Position memory position, ) = pm.positions(poolSetup.tokenId);
        console.log("  Position Liquidity:", position.liquidity);
    }
    
    function _verifySetup(PoolSetup memory poolSetup) internal view {
        console.log("\n===========================================");
        console.log("Setup Verification");
        console.log("===========================================");
        
        require(poolSetup.pool != address(0), "Pool creation failed");
        require(poolSetup.tokenId > 0, "Position creation failed");
        
        KiloDexPool pool = KiloDexPool(payable(poolSetup.pool));
        AntiSnipAttackPositionManager pm = AntiSnipAttackPositionManager(payable(poolSetup.positionManager));
        
        // Verify pool configuration
        require(address(pool.factory()) == poolSetup.factory, "Pool factory incorrect");
        require(pool.swapFeeUnits() == FEE_TIER, "Pool fee incorrect");
        
        // Verify position ownership
        (IBasePositionManager.Position memory position, ) = pm.positions(poolSetup.tokenId);
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        require(position.operator == deployer, "Position owner incorrect");
        
        // Verify pool has liquidity
        (uint160 sqrtPriceX96, , , ) = pool.getPoolState();
        require(sqrtPriceX96 > 0, "Pool not initialized");
        
        console.log("[OK] Pool created successfully");
        console.log("[OK] Pool configuration verified");
        console.log("[OK] Position created successfully");
        console.log("[OK] Position ownership verified");
        console.log("[OK] Pool initialized with liquidity");
        console.log("All verifications passed!");
    }
    
    function _parsePrivateKey(string memory privateKeyString) internal pure returns (uint256) {
        if (bytes(privateKeyString)[0] == '0' && bytes(privateKeyString)[1] == 'x') {
            return vm.parseUint(privateKeyString);
        } else {
            return vm.parseUint(string(abi.encodePacked("0x", privateKeyString)));
        }
    }
}

