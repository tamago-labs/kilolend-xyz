// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/tokens/AIAgentToken.sol";

/**
 * @title DeployKubsterToken
 * @notice Deploy Kubster Token (KUBS) using the generic AIAgentToken contract
 * @dev Usage: 
 *   forge script script/dex/1-DeployKubsterToken.s.sol --rpc-url $KUB_RPC_URL --broadcast --legacy
 *   
 *   Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - AI_AGENT_ADDRESS: Initial AI agent address (optional)
 */
contract DeployKubsterToken is Script {
    
    // Kubster Token Configuration
    string public constant TOKEN_NAME = "Kubster";
    string public constant TOKEN_SYMBOL = "KUBS";
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    struct TokenDeployment {
        address tokenAddress;
        address creator;
        address aiAgent;
        uint256 totalSupply;
    }
    
    function run() external returns (TokenDeployment memory) {
        return deploy();
    }
    
    /**
     * @notice Deploy Kubster token with configuration
     * @return deployment Token deployment details
     */
    function deploy() public returns (TokenDeployment memory) {
        console.log("===========================================");
        console.log("Deploy Kubster Token (KUBS)");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == 96, "Must deploy to KUB Chain (chain ID 96)");
        
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        // Check deployer balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance / 1e18, "KUB");
        require(balance > 0.01 ether, "Insufficient balance for deployment (need at least 0.01 KUB)");
        
        // Get AI agent address (optional)
        address aiAgent = _getAIAgentAddress();
        
        console.log("===========================================");
        console.log("Token Configuration:");
        console.log("  Name:", TOKEN_NAME);
        console.log("  Symbol:", TOKEN_SYMBOL);
        console.log("  Total Supply:", TOTAL_SUPPLY / 1e18);
        console.log("  Creator:", deployer);
        console.log("  AI Agent:", aiAgent == address(0) ? "Not set" : vm.toString(aiAgent));
        console.log("===========================================");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the token
        AIAgentToken kubsterToken = new AIAgentToken(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOTAL_SUPPLY,
            deployer,
            aiAgent
        );
        
        vm.stopBroadcast();
        
        // Create deployment result
        TokenDeployment memory deployment = TokenDeployment({
            tokenAddress: address(kubsterToken),
            creator: deployer,
            aiAgent: aiAgent,
            totalSupply: TOTAL_SUPPLY
        });
        
        _logDeploymentResults(deployment);
        _verifyDeployment(deployment);
        
        console.log("===========================================");
        console.log("Kubster Token deployment complete!");
        console.log("===========================================");
        
        return deployment;
    }
    
    function _getAIAgentAddress() internal view returns (address) {
        try vm.envAddress("AI_AGENT_ADDRESS") returns (address aiAgent) {
            return aiAgent;
        } catch {
            return address(0); // No AI agent specified
        }
    }
    
    function _logDeploymentResults(TokenDeployment memory deployment) internal view {
        console.log("\n===========================================");
        console.log("Kubster Token Deployment Results");
        console.log("===========================================");
        console.log("Token Address:", deployment.tokenAddress);
        console.log("Creator:", deployment.creator);
        console.log("AI Agent:", deployment.aiAgent == address(0) ? "Not set" : vm.toString(deployment.aiAgent));
        console.log("Total Supply:", deployment.totalSupply / 1e18);
        console.log("Token Decimals:");
        console.logUint(18);
        
        console.log("\nToken Holder Balances:");
        console.log("  Creator Balance:", AIAgentToken(deployment.tokenAddress).balanceOf(deployment.creator) / 1e18);
        
        console.log("\nRole Information:");
        console.log("  Is Creator:", AIAgentToken(deployment.tokenAddress).isCreator(deployment.creator));
        if (deployment.aiAgent != address(0)) {
            console.log("  Is AI Agent:", AIAgentToken(deployment.tokenAddress).isAIAgent(deployment.aiAgent));
        }
    }
    
    function _verifyDeployment(TokenDeployment memory deployment) internal view {
        console.log("\n===========================================");
        console.log("Deployment Verification");
        console.log("===========================================");
        
        require(deployment.tokenAddress != address(0), "Token deployment failed");
        
        AIAgentToken token = AIAgentToken(deployment.tokenAddress);
        
        // Verify token details
        require(keccak256(bytes(token.name())) == keccak256(bytes(TOKEN_NAME)), "Token name mismatch");
        require(keccak256(bytes(token.symbol())) == keccak256(bytes(TOKEN_SYMBOL)), "Token symbol mismatch");
        require(token.totalSupply() == TOTAL_SUPPLY, "Total supply mismatch");
        
        // Verify creator role
        require(token.isCreator(deployment.creator), "Creator role not assigned");
        
        // Verify AI agent role if set
        if (deployment.aiAgent != address(0)) {
            require(token.isAIAgent(deployment.aiAgent), "AI agent role not assigned");
        }
        
        // Verify creator received all tokens
        require(token.balanceOf(deployment.creator) == TOTAL_SUPPLY, "Creator did not receive tokens");
        
        console.log("[OK] Token address valid");
        console.log("[OK] Token name and symbol correct");
        console.log("[OK] Total supply correct");
        console.log("[OK] Creator role assigned");
        if (deployment.aiAgent != address(0)) {
            console.log("[OK] AI agent role assigned");
        }
        console.log("[OK] All tokens minted to creator");
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