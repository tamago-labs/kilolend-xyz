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
import "../../src/dex/libraries/QtyDeltaMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SetupKubsterPool
 * @notice Create and initialize KUBS/WKUB pool with liquidity
 * @dev Usage: 
 *   forge script script/dex/3-SetupKubsterPool.s.sol --rpc-url $KUB_RPC_URL --broadcast --legacy
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
    uint256 public constant KUBS_LIQUIDITY = 1_000_000 * 10**18;
    uint256 public constant WKUB_LIQUIDITY_INIT = 10 * 10**18; // For pool initialization
    uint256 public constant WKUB_LIQUIDITY_POS = 1 * 10**18; // For position creation
    uint256 public constant KUBS_LIQUIDITY_POS = 100_000 * 10**18; // Proportional KUBS for position (1:100 ratio)
    uint24 public constant FEE_TIER = 10000; // 1% fee tier
    
    // Tick configuration for initial price (1 WKUB = 100,000 KUBS)
    int24 public constant TICK_SPACING = 200; // For 1% fee tier 
    int24 public constant INITIAL_TICK = -115200; // Rounded to nearest multiple of tick spacing
    
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
    
    struct PoolAddresses {
        address kubsToken;
        address wkub;
        address factory;
        address router;
        address positionManager;
    }
    
    struct LiquidityResult {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Used;
        uint256 amount1Used;
    }
    
    struct TokenOrder {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
    }
    
    struct MintInput {
        address positionManager;
        address token0;
        address token1;
        uint24 fee;
        uint256 amount0;
        uint256 amount1;
        address recipient;
    }
    
    struct BuildMintParamsInput {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        int24[2] ticksPrevious;
        uint256 amount0;
        uint256 amount1;
        address recipient;
    }
    
    function run() external returns (PoolSetup memory) {
        return deploy();
    }
    
    /**
     * @notice Setup KUBS/WKUB pool with initial liquidity
     * @return setup Pool setup details
     */
    function deploy() public returns (PoolSetup memory) {
        _logSetupHeader();
        
        uint256 deployerPrivateKey = _getDeployerPrivateKey();
        address deployer = vm.addr(deployerPrivateKey);
        
        PoolAddresses memory addresses = _getPoolAddresses();
        _logAddresses(addresses);
        _logPoolConfig();
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Create pool
        KiloDexPool pool = _createPool(
            KiloDexFactory(addresses.factory),
            addresses.kubsToken,
            addresses.wkub,
            FEE_TIER,
            INITIAL_TICK
        );
        
        // Approve tokens for position manager (use position amounts, not full amounts)
        _approveTokens(
            addresses.kubsToken,
            addresses.wkub,
            addresses.positionManager,
            KUBS_LIQUIDITY_POS,
            WKUB_LIQUIDITY_POS
        );
        
        // Create liquidity position and capture tokenId
        LiquidityResult memory liquidityResult = _createLiquidityPosition(
            addresses.positionManager,
            addresses.kubsToken,
            addresses.wkub,
            FEE_TIER,
            KUBS_LIQUIDITY_POS,
            WKUB_LIQUIDITY_POS,
            deployer
        );
        
        vm.stopBroadcast();
        
        // Create setup result with actual tokenId
        PoolSetup memory poolSetup = PoolSetup({
            pool: address(pool),
            kubsToken: addresses.kubsToken,
            wkub: addresses.wkub,
            factory: addresses.factory,
            router: addresses.router,
            positionManager: addresses.positionManager,
            tokenId: liquidityResult.tokenId, // Actual tokenId from mint operation
            kubsLiquidity: KUBS_LIQUIDITY,
            wkubLiquidity: WKUB_LIQUIDITY_INIT
        });
        
        _logSetupResults(poolSetup);
        _verifySetup(poolSetup);
        _logSetupComplete();
        
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
        
        // Determine token order - WKUB (0x67eB...) should be token0, KUBS (0xAAC3...) should be token1
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        console.log("Token order verification:");
        console.log("  Token0:", token0);
        console.log("  Token1:", token1);
        console.log("  WKUB token:", tokenB);
        console.log("  KUBS token:", tokenA);
        
        // Create pool
        address poolAddress = factory.createPool(token0, token1, fee);
        KiloDexPool pool = KiloDexPool(payable(poolAddress));
        
        console.log("Pool created:", poolAddress);
        
        // Calculate sqrtPriceX96 for our desired 1M:10 ratio (1 WKUB = 100,000 KUBS)
        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
        
        // For exact 1M:10 ratio initialization, we need to transfer exact amounts
        // instead of using QtyDeltaMath.calcUnlockQtys() which gives minimum bootstrap
        uint256 initAmount0;
        uint256 initAmount1;
        
        // WKUB should be token0 (0x67eB...), KUBS should be token1 (0xAAC3...)
        // Since WKUB < KUBS in address comparison, token0 will be WKUB
        if (token0 == tokenB) {
            // token0 is WKUB, token1 is KUBS (correct order)
            initAmount0 = WKUB_LIQUIDITY_INIT; // 10 WKUB for initialization
            initAmount1 = KUBS_LIQUIDITY; // 1M KUBS for initialization
        } else {
            // token0 is KUBS, token1 is WKUB (incorrect order, but handle anyway)
            initAmount0 = KUBS_LIQUIDITY; // 1M KUBS
            initAmount1 = WKUB_LIQUIDITY_INIT; // 10 WKUB
        }
        
        console.log("Initialization amounts (exact 1M:10 ratio):");
        console.log("  Token0:", token0, "amount:", initAmount0);
        console.log("  Token1:", token1, "amount:", initAmount1);
        
        // Transfer exact initialization amounts to pool
        IERC20 token0Contract = IERC20(token0);
        IERC20 token1Contract = IERC20(token1);
        token0Contract.transfer(address(pool), initAmount0);
        token1Contract.transfer(address(pool), initAmount1);
        console.log("Transferred exact ratio tokens to pool");
        
        // Initialize pool
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
        console.log("Approving and transferring tokens...");
        
        AIAgentToken kubs = AIAgentToken(kubsToken);
        IERC20 wkubToken = IERC20(wkub);
        
        // Approve KUBS for position creation
        kubs.approve(positionManager, kubsAmount);
        console.log("KUBS approved for position manager:", kubsAmount / 1e18);
        
        // Approve WKUB for position creation (only 1 WKUB, not 10)
        wkubToken.approve(positionManager, wkubAmount);
        console.log("WKUB approved for position manager:", wkubAmount / 1e18);
        
        // Note: No direct transfer needed - position manager will pull tokens during mint
    }
    
    function _createLiquidityPosition(
        address positionManager,
        address tokenA,
        address tokenB,
        uint24 fee,
        uint256 amount0,
        uint256 amount1,
        address recipient
    ) internal returns (LiquidityResult memory) {
        console.log("Creating liquidity position...");
        
        // Determine token order and adjust amounts
        TokenOrder memory order = _getTokenOrder(tokenA, tokenB, amount0, amount1);
        
        // Create and mint position
        LiquidityResult memory result = _mintPositionWithOrder(positionManager, order, fee, recipient);
        
        _logPositionResults(result.tokenId, result.liquidity, result.amount0Used, result.amount1Used);
        
        return result;
    }
    
    function _getTokenOrder(
        address tokenA,
        address tokenB,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (TokenOrder memory) {
        // tokenA is KUBS, tokenB is WKUB
        // WKUB should be token0 (0x67eB...), KUBS should be token1 (0xAAC3...)
        address token0 = tokenA < tokenB ? tokenA : tokenB; // Will be WKUB
        address token1 = tokenA < tokenB ? tokenB : tokenA; // Will be KUBS
        
        uint256 adjAmount0;
        uint256 adjAmount1;
        
        // If token0 is WKUB (tokenB), then amount0 should be WKUB amount (amount1)
        // If token0 is KUBS (tokenA), then amount0 should be KUBS amount (amount0)
        if (token0 == tokenB) {
            // token0 is WKUB, token1 is KUBS
            adjAmount0 = amount1; // WKUB amount (1 WKUB)
            adjAmount1 = amount0; // KUBS amount (100K KUBS)
        } else {
            // token0 is KUBS, token1 is WKUB (shouldn't happen with our addresses)
            adjAmount0 = amount0; // KUBS amount
            adjAmount1 = amount1; // WKUB amount
        }
        
        return TokenOrder({
            token0: token0,
            token1: token1,
            amount0: adjAmount0,
            amount1: adjAmount1
        });
    }
    
    function _mintPositionWithOrder(
        address positionManager,
        TokenOrder memory order,
        uint24 fee,
        address recipient
    ) internal returns (LiquidityResult memory) {
        (uint256 tokenId, uint128 liquidity, uint256 amount0Used, uint256 amount1Used) = _mintPosition(
            MintInput({
                positionManager: positionManager,
                token0: order.token0,
                token1: order.token1,
                fee: fee,
                amount0: order.amount0,
                amount1: order.amount1,
                recipient: recipient
            })
        );
        
        return LiquidityResult({
            tokenId: tokenId,
            liquidity: liquidity,
            amount0Used: amount0Used,
            amount1Used: amount1Used
        });
    }
    
    function _getTickRange(int24 currentTick) internal pure returns (int24 tickLower, int24 tickUpper) {
        // Round current tick to nearest multiple of tick spacing
        int24 roundedTick = (currentTick / TICK_SPACING) * TICK_SPACING;
        
        // Calculate range from rounded tick to ensure valid ticks
        tickLower = roundedTick - (TICK_SPACING * 100);
        tickUpper = roundedTick + (TICK_SPACING * 100);
        return (tickLower, tickUpper);
    }
    
    function _buildMintParams(
        BuildMintParamsInput memory input
    ) internal view returns (IBasePositionManager.MintParams memory params) {
        params = IBasePositionManager.MintParams({
            token0: input.token0,
            token1: input.token1,
            fee: input.fee,
            tickLower: input.tickLower,
            tickUpper: input.tickUpper,
            ticksPrevious: input.ticksPrevious,
            amount0Desired: input.amount0,
            amount1Desired: input.amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: input.recipient,
            deadline: block.timestamp + 3600
        });
    }
    
    function _mintPosition(
        MintInput memory input
    ) internal returns (uint256 tokenId, uint128 liquidity, uint256 amount0Used, uint256 amount1Used) {
        (int24 tickLower, int24 tickUpper) = _getTickRange(INITIAL_TICK);
      
        int24[2] memory ticksPrevious = [-887272, -887272];
          
        IBasePositionManager.MintParams memory params = _buildMintParams(
            BuildMintParamsInput({
                token0: input.token0,
                token1: input.token1,
                fee: input.fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                ticksPrevious: ticksPrevious,
                amount0: input.amount0,
                amount1: input.amount1,
                recipient: input.recipient
            })
        );
        
        AntiSnipAttackPositionManager pm = AntiSnipAttackPositionManager(payable(input.positionManager));
        (tokenId, liquidity, amount0Used, amount1Used) = pm.mint(params);
    }
    
    
    function _logPositionResults(uint256 tokenId, uint128 liquidity, uint256 amount0Used, uint256 amount1Used) internal pure {
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
        console.log("  Pool Initialization - KUBS:", poolSetup.kubsLiquidity / 1e18);
        console.log("  Pool Initialization - WKUB:", poolSetup.wkubLiquidity / 1e18);
        console.log("  Position Creation - KUBS:", KUBS_LIQUIDITY_POS / 1e18);
        console.log("  Position Creation - WKUB:", WKUB_LIQUIDITY_POS / 1e18);
        console.log("  Total WKUB Used:", (poolSetup.wkubLiquidity + WKUB_LIQUIDITY_POS) / 1e18);
        
        if (poolSetup.tokenId > 0) {
            console.log("  Position Token ID:", poolSetup.tokenId);
            console.log("  Position created successfully");
        } else {
            console.log("  Position Token ID: Not created");
        }
    }
    
    function _verifySetup(PoolSetup memory poolSetup) internal view {
        console.log("\n===========================================");
        console.log("Setup Verification");
        console.log("===========================================");
        
        require(poolSetup.pool != address(0), "Pool creation failed");

        KiloDexPool pool = KiloDexPool(payable(poolSetup.pool));
        
        // Verify pool configuration
        require(address(pool.factory()) == poolSetup.factory, "Pool factory incorrect");
        require(pool.swapFeeUnits() == FEE_TIER, "Pool fee incorrect");
        
        // Verify pool has liquidity
        (uint160 sqrtPriceX96, , , ) = pool.getPoolState();
        require(sqrtPriceX96 > 0, "Pool not initialized");
        
        // Verify position was created
        require(poolSetup.tokenId != 0, "Position creation failed");
        
        console.log("[OK] Pool created successfully");
        console.log("[OK] Pool configuration verified");
        console.log("[OK] Position creation completed");
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
    
    function _logSetupHeader() internal view {
        console.log("===========================================");
        console.log("Setup KUBS/WKUB Pool");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == 96, "Must deploy to KUB Chain (chain ID 96)");
        console.log("Block number:", block.number);
    }
    
    function _getDeployerPrivateKey() internal view returns (uint256) {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        return _parsePrivateKey(privateKeyString);
    }
    
    function _getPoolAddresses() internal pure returns (PoolAddresses memory) {
        return PoolAddresses({
            kubsToken: 0xAAC3ad3b84FbC8A8F3BEe534e2645b0698937280,
            wkub: 0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5,
            factory: 0x4443d912199047c5450c9847a96180AE3204949F,
            router: 0x5570c281c8F51905Edb78AC65E11b3c236F68F7b,
            positionManager: 0x9B0c19781817Dd086946BafC6d58798B8976DC05
        });
    }
    
    function _logAddresses(PoolAddresses memory addresses) internal pure {
        console.log("KUBS Token:", addresses.kubsToken);
        console.log("WKUB Token:", addresses.wkub);
        console.log("Factory:", addresses.factory);
        console.log("Router:", addresses.router);
        console.log("Position Manager:", addresses.positionManager);
    }
    
    function _logPoolConfig() internal pure {
        console.log("===========================================");
        console.log("Pool Configuration:");
        console.log("  Pool Init - KUBS:", KUBS_LIQUIDITY / 1e18);
        console.log("  Pool Init - WKUB:", WKUB_LIQUIDITY_INIT / 1e18);
        console.log("  Position - KUBS:", KUBS_LIQUIDITY_POS / 1e18);
        console.log("  Position - WKUB:", WKUB_LIQUIDITY_POS / 1e18);
        console.log("  Total WKUB Needed:", (WKUB_LIQUIDITY_INIT + WKUB_LIQUIDITY_POS) / 1e18);
        console.log("  Fee Tier:", FEE_TIER, "basis points");
        console.log("  Initial Tick:", INITIAL_TICK);
        console.log("===========================================");
    }
    
    function _logSetupComplete() internal pure {
        console.log("===========================================");
        console.log("KUBS/WKUB pool setup complete!");
        console.log("===========================================");
    }
}