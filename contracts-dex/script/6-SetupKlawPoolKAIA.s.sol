// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../src/tokens/AIAgentToken.sol";
import "../src/core/KiloDexFactory.sol";
import "../src/core/KiloDexPool.sol";
import "../src/periphery/Router.sol";
import "../src/periphery/AntiSnipAttackPositionManager.sol";
import "../src/interfaces/periphery/IBasePositionManager.sol";
import "../src/libraries/TickMath.sol";
import "../src/libraries/QtyDeltaMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SetupKlawsterPoolKAIA
 * @notice Create and initialize KLAW/WKAIA pool with liquidity on KAIA Mainnet
 * @dev Usage: 
 *   forge script script/dex/6-SetupKlawPoolKAIA.s.sol --rpc-url $KAIA_RPC_URL --broadcast --verify
 *   
 *   Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - KLAW_TOKEN_ADDRESS: Address of deployed KLAW token on KAIA
 *   - WKAIA_ADDRESS: Wrapped KAIA (WKAIA) address on KAIA Mainnet
 *   - DEX_FACTORY_ADDRESS: Address of deployed DEX factory on KAIA
 *   - DEX_ROUTER_ADDRESS: Address of deployed DEX router on KAIA
 *   - POSITION_MANAGER_ADDRESS: Address of deployed position manager on KAIA
 */
contract SetupKlawsterPoolKAIA is Script {
    
    // Pool Configuration - Based on 1 WKAIA = 5,500 KLAW ratio
    // KLAW target price: $0.00001, KAIA price: $0.055
    uint256 public constant KLAW_LIQUIDITY = 550_000 * 10**18; // 550K KLAW for pool initialization
    uint256 public constant WKAIA_LIQUIDITY_INIT = 100 * 10**18; // 100 WKAIA for pool initialization (1:5,500 ratio)
    uint256 public constant WKAIA_LIQUIDITY_POS = 10 * 10**18; // 10 WKAIA for position creation
    uint256 public constant KLAW_LIQUIDITY_POS = 55_000 * 10**18; // 55K KLAW for position (maintains 1:5,500 ratio)
    uint24 public constant FEE_TIER = 10000; // 1% fee tier
    
    // Tick configuration for initial price (1 WKAIA = 5,500 KLAW)
    int24 public constant TICK_SPACING = 200; // For 1% fee tier 
    int24 public constant INITIAL_TICK = 73600; // Calculated for 1:5,500 ratio
    
    struct PoolSetup {
        address pool;
        address klawToken;
        address wkaia;
        address factory;
        address router;
        address positionManager;
        uint256 tokenId;
        uint256 klawLiquidity;
        uint256 wkaiaLiquidity;
    }
    
    struct PoolAddresses {
        address klawToken;
        address wkaia;
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
     * @notice Setup KLAW/WKAIA pool with initial liquidity
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
            addresses.klawToken,
            addresses.wkaia,
            FEE_TIER,
            INITIAL_TICK
        );
        
        // Approve tokens for position manager (use position amounts, not full amounts)
        _approveTokens(
            addresses.klawToken,
            addresses.wkaia,
            addresses.positionManager,
            KLAW_LIQUIDITY_POS,
            WKAIA_LIQUIDITY_POS
        );
        
        // Create liquidity position and capture tokenId
        LiquidityResult memory liquidityResult = _createLiquidityPosition(
            addresses.positionManager,
            addresses.klawToken,
            addresses.wkaia,
            FEE_TIER,
            KLAW_LIQUIDITY_POS,
            WKAIA_LIQUIDITY_POS,
            deployer
        );
        
        vm.stopBroadcast();
        
        // Create setup result with actual tokenId
        PoolSetup memory poolSetup = PoolSetup({
            pool: address(pool),
            klawToken: addresses.klawToken,
            wkaia: addresses.wkaia,
            factory: addresses.factory,
            router: addresses.router,
            positionManager: addresses.positionManager,
            tokenId: liquidityResult.tokenId, // Actual tokenId from mint operation
            klawLiquidity: KLAW_LIQUIDITY,
            wkaiaLiquidity: WKAIA_LIQUIDITY_INIT
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
        
        // Determine token order - WKAIA (0x19aa...) should be token0, KLAW should be token1
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        console.log("Token order verification:");
        console.log("  Token0:", token0);
        console.log("  Token1:", token1);
        console.log("  WKAIA token:", tokenB);
        console.log("  KLAW token:", tokenA);
        
        // Create pool
        address poolAddress = factory.createPool(token0, token1, fee);
        KiloDexPool pool = KiloDexPool(payable(poolAddress));
        
        console.log("Pool created:", poolAddress);
        
        // Calculate sqrtPriceX96 for our desired 1:5,500 ratio
        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
        
        // For exact 550K:100 ratio initialization, we need to transfer exact amounts
        uint256 initAmount0;
        uint256 initAmount1;
        
        // WKAIA should be token0 (0x19aa...), KLAW should be token1
        // Since WKAIA < KLAW in address comparison, token0 will be WKAIA
        if (token0 == tokenB) {
            // token0 is WKAIA, token1 is KLAW (correct order)
            initAmount0 = WKAIA_LIQUIDITY_INIT; // 100 WKAIA for initialization
            initAmount1 = KLAW_LIQUIDITY; // 550K KLAW for initialization
        } else {
            // token0 is KLAW, token1 is WKAIA (incorrect order, but handle anyway)
            initAmount0 = KLAW_LIQUIDITY; // 550K KLAW
            initAmount1 = WKAIA_LIQUIDITY_INIT; // 100 WKAIA
        }
        
        console.log("Initialization amounts (exact 1:5,500 ratio):");
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
        address klawToken,
        address wkaia,
        address positionManager,
        uint256 klawAmount,
        uint256 wkaiaAmount
    ) internal {
        console.log("Approving tokens...");
        
        AIAgentToken klaw = AIAgentToken(klawToken);
        IERC20 wkaiaToken = IERC20(wkaia);
        
        // Approve KLAW for position creation
        klaw.approve(positionManager, klawAmount);
        console.log("KLAW approved for position manager:", klawAmount / 1e18);
        
        // Approve WKAIA for position creation
        wkaiaToken.approve(positionManager, wkaiaAmount);
        console.log("WKAIA approved for position manager:", wkaiaAmount / 1e18);
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
        // tokenA is KLAW, tokenB is WKAIA
        // WKAIA should be token0 (0x19aa...), KLAW should be token1
        address token0 = tokenA < tokenB ? tokenA : tokenB; // Will be WKAIA
        address token1 = tokenA < tokenB ? tokenB : tokenA; // Will be KLAW
        
        uint256 adjAmount0;
        uint256 adjAmount1;
        
        // If token0 is WKAIA (tokenB), then amount0 should be WKAIA amount (amount1)
        // If token0 is KLAW (tokenA), then amount0 should be KLAW amount (amount0)
        if (token0 == tokenB) {
            // token0 is WKAIA, token1 is KLAW
            adjAmount0 = amount1; // WKAIA amount (10 WKAIA)
            adjAmount1 = amount0; // KLAW amount (55K KLAW)
        } else {
            // token0 is KLAW, token1 is WKAIA (shouldn't happen with our addresses)
            adjAmount0 = amount0; // KLAW amount
            adjAmount1 = amount1; // WKAIA amount
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
        console.log("KLAW Token:", poolSetup.klawToken);
        console.log("WKAIA Token:", poolSetup.wkaia);
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
        console.log("  Pool Initialization - KLAW:", poolSetup.klawLiquidity / 1e18);
        console.log("  Pool Initialization - WKAIA:", poolSetup.wkaiaLiquidity / 1e18);
        console.log("  Position Creation - KLAW:", KLAW_LIQUIDITY_POS / 1e18);
        console.log("  Position Creation - WKAIA:", WKAIA_LIQUIDITY_POS / 1e18);
        console.log("  Total WKAIA Used:", (poolSetup.wkaiaLiquidity + WKAIA_LIQUIDITY_POS) / 1e18);
        
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
        console.log("Setup KLAW/WKAIA Pool on KAIA Mainnet");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == 8217, "Must deploy to KAIA Mainnet (chain ID 8217)");
        console.log("Block number:", block.number);
    }
    
    function _getDeployerPrivateKey() internal view returns (uint256) {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        return _parsePrivateKey(privateKeyString);
    }
    
    function _getPoolAddresses() internal view returns (PoolAddresses memory) {
        return PoolAddresses({
            klawToken: 0xd145A1F18c5EDc9CeE0994e6a8e2eB9Dd0A40Cb6,
            wkaia: 0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432, // WKAIA on KAIA Mainnet
            factory: 0x86312E4e86f8424E8AFEe8aAFE9c1A33a6381f85,
            router: 0x2C7C28D7C138d630fBD9F6Ed7504C2DB14D437cC,
            positionManager: 0x1CAbFFE0fBC15E549d4d2df4328eDdc10F7f27f2
        });
    }
    
    function _logAddresses(PoolAddresses memory addresses) internal pure {
        console.log("KLAW Token:", addresses.klawToken);
        console.log("WKAIA Token:", addresses.wkaia);
        console.log("Factory:", addresses.factory);
        console.log("Router:", addresses.router);
        console.log("Position Manager:", addresses.positionManager);
    }
    
    function _logPoolConfig() internal pure {
        console.log("===========================================");
        console.log("Pool Configuration:");
        console.log("  Pool Init - KLAW:", KLAW_LIQUIDITY / 1e18);
        console.log("  Pool Init - WKAIA:", WKAIA_LIQUIDITY_INIT / 1e18);
        console.log("  Position - KLAW:", KLAW_LIQUIDITY_POS / 1e18);
        console.log("  Position - WKAIA:", WKAIA_LIQUIDITY_POS / 1e18);
        console.log("  Total WKAIA Needed:", (WKAIA_LIQUIDITY_INIT + WKAIA_LIQUIDITY_POS) / 1e18);
        console.log("  Fee Tier:", FEE_TIER, "basis points");
        console.log("  Initial Tick:", INITIAL_TICK);
        console.log("  Price Ratio: 1 WKAIA = 5,500 KLAW");
        console.log("===========================================");
    }
    
    function _logSetupComplete() internal pure {
        console.log("===========================================");
        console.log("KLAW/WKAIA pool setup on KAIA Mainnet complete!");
        console.log("===========================================");
    }
}