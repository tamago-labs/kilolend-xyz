// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/tokens/AIAgentToken.sol";
import "../../src/dex/core/KiloDexFactory.sol";
import "../../src/dex/periphery/Router.sol";
import "../../src/dex/core/KiloDexPool.sol";
import "../../src/dex/periphery/AntiSnipAttackPositionManager.sol";
import "../../src/dex/periphery/TokenPositionDescriptor.sol";
import "../../src/dex/periphery/QuoterV2.sol";
import "../../src/dex/periphery/TicksFeesReader.sol";
import "../../src/dex/oracle/PoolOracle.sol";

/**
 * @title DeployKaiaDEX
 * @notice Deploy KAIA-specific DEX (Factory, Router, Libraries) for Klawster ecosystem on KAIA Mainnet
 * @dev Usage: 
 *   forge script script/dex/5-DeployKaiaDEX.s.sol --rpc-url $KAIA_RPC_URL --broadcast --verify
 *   
 *   Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - KLAW_TOKEN_ADDRESS: Address of deployed KLAW token on KAIA
 *   - WKAIA_ADDRESS: Wrapped KAIA (WKAIA) address on KAIA Mainnet
 */
contract DeployKaiaDEX is Script {
    
    // KAIA DEX Configuration
    uint32 public constant VESTING_PERIOD = 30 days; // 30 days vesting period
    
    struct DEXDeployment {
        address factory;
        address router;
        address positionManager;
        address poolOracle;
        address quoter;
        address ticksFeesReader;
        address descriptor;
        address klawToken;
        address wkaia;
    }
    
    function run() external returns (DEXDeployment memory) {
        return deploy();
    }
    
    /**
     * @notice Deploy KAIA DEX components
     * @return deployment DEX deployment details
     */
    function deploy() public returns (DEXDeployment memory) {
        console.log("===========================================");
        console.log("Deploy KAIA DEX Components on KAIA Mainnet");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == 8217, "Must deploy to KAIA Mainnet (chain ID 8217)");
        
        uint256 deployerPrivateKey = _getDeployerPrivateKey();
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        address klawToken = 0xd145A1F18c5EDc9CeE0994e6a8e2eB9Dd0A40Cb6;
        address wkaia = 0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432; // WKAIA on KAIA Mainnet
        
        console.log("KLAW Token:", klawToken);
        console.log("WKAIA:", wkaia);
        
        console.log("===========================================");
        console.log("DEX Configuration:");
        console.log("  Vesting Period:", VESTING_PERIOD, "seconds");
        console.log("  Using AntiSnipAttackPositionManager");
        console.log("===========================================");
        
        // Deploy core contracts in separate broadcast blocks to reduce stack depth
        vm.startBroadcast(deployerPrivateKey);
        PoolOracle poolOracle = new PoolOracle();
        vm.stopBroadcast();
        console.log("PoolOracle deployed:", address(poolOracle));
        
        vm.startBroadcast(deployerPrivateKey);
        KiloDexFactory factory = new KiloDexFactory(VESTING_PERIOD, address(poolOracle));
        vm.stopBroadcast();
        console.log("Factory deployed:", address(factory));
        
        vm.startBroadcast(deployerPrivateKey);
        TokenPositionDescriptor descriptor = new TokenPositionDescriptor();
        vm.stopBroadcast();
        console.log("Descriptor deployed:", address(descriptor));
        
        vm.startBroadcast(deployerPrivateKey);
        AntiSnipAttackPositionManager positionManager = new AntiSnipAttackPositionManager(
            address(factory),
            wkaia,
            address(descriptor)
        );
        vm.stopBroadcast();
        console.log("AntiSnipAttackPositionManager deployed:", address(positionManager));
        
        vm.startBroadcast(deployerPrivateKey);
        Router router = new Router(address(factory), wkaia);
        vm.stopBroadcast();
        console.log("Router deployed:", address(router));
        
        vm.startBroadcast(deployerPrivateKey);
        QuoterV2 quoter = new QuoterV2(address(factory));
        vm.stopBroadcast();
        console.log("QuoterV2 deployed:", address(quoter));
        
        vm.startBroadcast(deployerPrivateKey);
        TicksFeesReader ticksFeesReader = new TicksFeesReader();
        vm.stopBroadcast();
        console.log("TicksFeesReader deployed:", address(ticksFeesReader));
        
        // Configure factory in separate transaction
        vm.startBroadcast(deployerPrivateKey);
        factory.addNFTManager(address(positionManager));
        factory.enableSwapFee(3000, 60);   // 0.3% - standard/most common
        factory.enableSwapFee(5000, 100);   // 0.5% - higher fee
        factory.enableSwapFee(10000, 200);  // 1% - highest fee
        factory.updateFeeConfiguration(deployer, 100);
        vm.stopBroadcast();
        
        console.log("Fee tiers enabled: 0.3%, 0.5%, 1%");
        console.log("Government fee set to 0.01%");
        
        // Create deployment result
        DEXDeployment memory deployment;
        deployment.factory = address(factory);
        deployment.router = address(router);
        deployment.positionManager = address(positionManager);
        deployment.poolOracle = address(poolOracle);
        deployment.quoter = address(quoter);
        deployment.ticksFeesReader = address(ticksFeesReader);
        deployment.descriptor = address(descriptor);
        deployment.klawToken = klawToken;
        deployment.wkaia = wkaia;
        
        _logDeploymentResults(deployment);
        _verifyDeployment(deployment, deployerPrivateKey);
        
        console.log("===========================================");
        console.log("KAIA DEX deployment complete!");
        console.log("===========================================");
        
        return deployment;
    }

    function _getDeployerPrivateKey() internal view returns (uint256) {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        return _parsePrivateKey(privateKeyString);
    }

    function _logDeploymentResults(DEXDeployment memory deployment) internal view {
        console.log("\n===========================================");
        console.log("KAIA DEX Deployment Results");
        console.log("===========================================");
        console.log("Factory Address:", deployment.factory);
        console.log("Router Address:", deployment.router);
        console.log("PositionManager Address:", deployment.positionManager);
        console.log("PoolOracle Address:", deployment.poolOracle);
        console.log("QuoterV2 Address:", deployment.quoter);
        console.log("TicksFeesReader Address:", deployment.ticksFeesReader);
        console.log("Descriptor Address:", deployment.descriptor);
        console.log("KLAW Token:", deployment.klawToken);
        console.log("WKAIA Token:", deployment.wkaia);
    }
    
    function _verifyDeployment(DEXDeployment memory deployment, uint256 deployerPrivateKey) internal view {
        console.log("\n===========================================");
        console.log("Deployment Verification");
        console.log("===========================================");
        
        require(deployment.factory != address(0), "Factory deployment failed");
        require(deployment.router != address(0), "Router deployment failed");
        require(deployment.positionManager != address(0), "PositionManager deployment failed");
        require(deployment.poolOracle != address(0), "PoolOracle deployment failed");
        require(deployment.quoter != address(0), "QuoterV2 deployment failed");
        require(deployment.ticksFeesReader != address(0), "TicksFeesReader deployment failed");
        require(deployment.descriptor != address(0), "Descriptor deployment failed");
        
        address deployer = vm.addr(deployerPrivateKey);
        
        // Verify factory
        KiloDexFactory factory = KiloDexFactory(deployment.factory);
        require(factory.configMaster() == deployer, "Factory config master not set correctly");
        require(factory.poolOracle() == deployment.poolOracle, "Factory pool oracle not set correctly");
        require(factory.vestingPeriod() == VESTING_PERIOD, "Factory vesting period incorrect");
        console.log("[OK] Factory configuration verified");
        
        // Verify router
        Router router = Router(payable(deployment.router));
        require(address(router.factory()) == deployment.factory, "Router factory not set correctly");
        require(router.WETH() == deployment.wkaia, "Router WETH not set correctly");
        console.log("[OK] Router configuration verified");
        
        // Verify position manager
        AntiSnipAttackPositionManager pm = AntiSnipAttackPositionManager(payable(deployment.positionManager));
        require(pm.factory() == deployment.factory, "PositionManager factory not set correctly");
        require(pm.WETH() == deployment.wkaia, "PositionManager WETH not set correctly");
        console.log("[OK] PositionManager configuration verified");
        
        // Verify whitelist and fee tiers
        require(factory.isWhitelistedNFTManager(deployment.positionManager), "PositionManager not whitelisted");
        require(factory.feeAmountTickDistance(3000) == 60, "Fee tier 3000 (0.3%) not enabled");
        require(factory.feeAmountTickDistance(5000) == 100, "Fee tier 5000 (0.5%) not enabled");
        require(factory.feeAmountTickDistance(10000) == 200, "Fee tier 10000 (1%) not enabled");
        console.log("[OK] PositionManager whitelisted");
        console.log("[OK] All fee tiers enabled");
        
        // Verify government fee
        (address feeTo, uint24 governmentFeeUnits) = factory.feeConfiguration();
        require(feeTo == deployer, "Government fee recipient not set correctly");
        require(governmentFeeUnits == 100, "Government fee not set to 100 basis points");
        console.log("[OK] Government fee configured");
        
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