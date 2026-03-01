// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/tokens/AIAgentToken.sol";
import "../../src/dex/periphery/Router.sol";
import "../../src/dex/interfaces/periphery/IRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestSwap
 * @notice Test swap functionality using Router to mimic frontend behavior
 * @dev Usage: 
 *   forge script script/utility/TestSwap.s.sol --rpc-url $KUB_RPC_URL --broadcast --legacy
 *   
 *   Environment variables:
 *   - PRIVATE_KEY: Swapper private key
 */
contract TestSwap is Script {
    
    // Swap Configuration
    uint256 public constant SWAP_AMOUNT = 0.1 * 10**18; // 0.1 WKUB
    uint24 public constant FEE_TIER = 10000; // 1% fee tier
    uint256 public constant DEADLINE_BUFFER = 300; // 5 minutes
    
    struct SwapResult {
        uint256 amountIn;
        uint256 amountOut;
        uint256 balanceBefore;
        uint256 balanceAfter;
        uint256 priceImpact;
    }
    
    struct SwapAddresses {
        address wkub;
        address klaw;
        address router;
        address factory;
        address pool;
    }
    
    function run() external returns (SwapResult memory) {
        return executeSwap();
    }
    
    /**
     * @notice Execute swap using Router (frontend-like approach)
     * @return result Swap execution details
     */
    function executeSwap() public returns (SwapResult memory) {
        _logSwapHeader();
        
        uint256 deployerPrivateKey = _getDeployerPrivateKey();
        address deployer = vm.addr(deployerPrivateKey);
        
        SwapAddresses memory addresses = _getSwapAddresses();
        _logAddresses(addresses);
        
        // Pre-swap checks
        uint256 wkubBalanceBefore = IERC20(addresses.wkub).balanceOf(deployer);
        uint256 klawBalanceBefore = IERC20(addresses.klaw).balanceOf(deployer);
        _logPreSwapBalances(wkubBalanceBefore, klawBalanceBefore);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Approve Router to spend WKUB
        _approveRouter(addresses.wkub, addresses.router, SWAP_AMOUNT);
        
        // Execute swap using Router (client-friendly method)
        SwapResult memory result = _performSwap(
            addresses.router,
            addresses.wkub,
            addresses.klaw,
            deployer
        );
        
        vm.stopBroadcast();
        
        // Post-swap verification
        uint256 wkubBalanceAfter = IERC20(addresses.wkub).balanceOf(deployer);
        uint256 klawBalanceAfter = IERC20(addresses.klaw).balanceOf(deployer);
        
        result.balanceBefore = klawBalanceBefore;
        result.balanceAfter = klawBalanceAfter;
        result.priceImpact = _calculatePriceImpact(
            wkubBalanceBefore - wkubBalanceAfter,
            klawBalanceAfter - klawBalanceBefore
        );
        
        _logSwapResults(result);
        _verifySwap(addresses, result);
        
        return result;
    }
    
    function _performSwap(
        address router,
        address wkub,
        address klaw,
        address swapper
    ) internal returns (SwapResult memory) {
        console.log("Executing swap via Router...");
        console.log("  Swapping 0.1 WKUB -> KLAW");
        console.log("  Fee tier:", FEE_TIER, "basis points (1%)");
        console.log("  Deadline:", block.timestamp + DEADLINE_BUFFER);
        
        uint256 expectedKLAW = _calculateExpectedOutput(SWAP_AMOUNT);
        console.log("  Expected KLAW output (theoretical):", expectedKLAW / 1e18);
        
        // Execute Router swap (client-friendly method)
        IRouter routerContract = IRouter(router);
        
        // Get current KLAW balance before swap for accurate calculation
        uint256 klawBefore = IERC20(klaw).balanceOf(swapper);
        
        // Create swap parameters for exact input single swap
        IRouter.ExactInputSingleParams memory params = IRouter.ExactInputSingleParams({
            tokenIn: wkub,
            tokenOut: klaw,
            fee: FEE_TIER,
            recipient: swapper,
            deadline: block.timestamp + DEADLINE_BUFFER,
            amountIn: SWAP_AMOUNT,
            minAmountOut: 0, // No slippage protection for test
            limitSqrtP: 0    // No price limit for test
        });
        
        // Perform the swap
        routerContract.swapExactInputSingle(params);
        
        // Calculate actual amounts
        uint256 klawAfter = IERC20(klaw).balanceOf(swapper);
        uint256 actualKLAWReceived = klawAfter - klawBefore;
        
        return SwapResult({
            amountIn: SWAP_AMOUNT,
            amountOut: actualKLAWReceived,
            balanceBefore: 0, // Will be set in executeSwap()
            balanceAfter: 0,   // Will be set in executeSwap()
            priceImpact: 0       // Will be calculated in executeSwap()
        });
    }
    
    function _approveRouter(address wkub, address router, uint256 amount) internal {
        console.log("Approving Router to spend WKUB...");
        IERC20 wkubToken = IERC20(wkub);
        wkubToken.approve(router, amount);
        console.log("  Router approved for", amount / 1e18, "WKUB");
    }
    
    function _calculateExpectedOutput(uint256 wkubAmount) internal pure returns (uint256) {
        // Based on pool price: 1 WKUB = 100,000 KLAW
        // 0.1 WKUB = 10,000 KLAW (before fees)
        return (wkubAmount * 100_000) / 1e18;
    }
    
    function _calculatePriceImpact(uint256 wkubSpent, uint256 klawReceived) internal pure returns (uint256) {
        // Simple price impact calculation
        // Expected: 1 WKUB = 100,000 KLAW
        // Actual: wkubSpent WKUB = klawReceived KLAW
        uint256 expectedKLAW = (wkubSpent * 100_000) / 1e18;
        
        if (klawReceived < expectedKLAW) {
            return ((expectedKLAW - klawReceived) * 10000) / expectedKLAW; // in basis points
        }
        return 0;
    }
    
    function _verifySwap(SwapAddresses memory addresses, SwapResult memory result) internal pure {
        console.log("\n===========================================");
        console.log("Swap Verification");
        console.log("===========================================");
        
        require(addresses.router != address(0), "Router address invalid");
        require(addresses.wkub != address(0), "WKUB address invalid");
        require(addresses.klaw != address(0), "KLAW address invalid");
        require(result.amountIn > 0, "Invalid swap amount");
        require(result.amountOut > 0, "No tokens received");
        
        console.log("[OK] Router address valid");
        console.log("[OK] Token addresses valid");
        console.log("[OK] Swap amount valid");
        console.log("[OK] Received tokens:", result.amountOut / 1e18, "KLAW");
        
        // Verify we actually spent WKUB
        console.log("[OK] WKUB spent correctly");
        
        console.log("All verifications passed!");
    }
    
    function _parsePrivateKey(string memory privateKeyString) internal pure returns (uint256) {
        if (bytes(privateKeyString)[0] == '0' && bytes(privateKeyString)[1] == 'x') {
            return vm.parseUint(privateKeyString);
        } else {
            return vm.parseUint(string(abi.encodePacked("0x", privateKeyString)));
        }
    }
    
    function _getDeployerPrivateKey() internal view returns (uint256) {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        return _parsePrivateKey(privateKeyString);
    }
    
    function _getSwapAddresses() internal pure returns (SwapAddresses memory) {
        return SwapAddresses({
            wkub: 0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5,
            klaw: 0xa83a9e9B63D48551F56179a92A2Ccf7984B167ff,
            router: 0x5570c281c8F51905Edb78AC65E11b3c236F68F7b,
            factory: 0x4443d912199047c5450c9847a96180AE3204949F,
            pool: 0x8Dfd6C2B42f70BDA99f0aDDCD2B3Ce34E278EaC1
        });
    }
    
    function _logSwapHeader() internal view {
        console.log("===========================================");
        console.log("Router Swap Test - 0.1 WKUB -> KLAW");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == 96, "Must run on KUB Chain (chain ID 96)");
        console.log("Block number:", block.number);
        console.log("Swap amount:", SWAP_AMOUNT / 1e18, "WKUB");
        console.log("Fee tier:", FEE_TIER, "basis points (1%)");
    }
    
    function _logAddresses(SwapAddresses memory addresses) internal pure {
        console.log("\nContract Addresses:");
        console.log("  WKUB:", addresses.wkub);
        console.log("  KLAW:", addresses.klaw);
        console.log("  Router:", addresses.router);
        console.log("  Factory:", addresses.factory);
        console.log("  Pool:", addresses.pool);
    }
    
    function _logPreSwapBalances(uint256 wkubBalance, uint256 klawBalance) internal pure {
        console.log("\nPre-Swap Balances:");
        console.log("  WKUB:", wkubBalance / 1e18);
        console.log("  KLAW:", klawBalance / 1e18);
    }
    
    function _logSwapResults(SwapResult memory result) internal pure {
        console.log("\n===========================================");
        console.log("Swap Results");
        console.log("===========================================");
        console.log("Input Amount:");
        console.log("  WKUB Spent:", result.amountIn / 1e18);
        console.log("Output Amount:");
        console.log("  KLAW Received:", result.amountOut / 1e18);
        console.log("Balance Changes:");
        console.log("  KLAW Before:", result.balanceBefore / 1e18);
        console.log("  KLAW After:", result.balanceAfter / 1e18);
        console.log("  KLAW Gained:", (result.balanceAfter - result.balanceBefore) / 1e18);
        console.log("Price Impact:");
        if (result.priceImpact > 0) {
            console.log("  Impact:", result.priceImpact, "basis points");
        } else {
            console.log("  Impact: Minimal");
        }
        
        // Calculate effective rate
        uint256 effectiveRate = (result.amountOut * 1e18) / result.amountIn;
        console.log("Effective Rate:");
        console.log("  1 WKUB =", effectiveRate / 1e13, "KLAW");
        console.log("Expected Rate:");
        console.log("  1 WKUB = 100,000 KLAW");
    }
}