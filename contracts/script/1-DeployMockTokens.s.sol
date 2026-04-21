// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {ERC20Mock} from "../src/mocks/ERC20Mock.sol";

/**
 * @title DeployMockTokens
 * @notice Deploy 3 mock ERC20 tokens: KKUB, KBTC, KUSDT
 * @dev Usage:
 *   forge script script/1-DeployMockTokens.s.sol --rpc-url $RPC_URL --broadcast --legacy
 *
 *   Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 */
contract DeployMockTokens is Script {

    struct TokenInfo {
        string name;
        string symbol;
        uint8 decimals;
        address tokenAddress;
    }

    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("Deploy Mock Tokens (KKUB, KBTC, KUSDT)");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Block number:", block.number);

        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance / 1e18, "native tokens");
        require(balance > 0.01 ether, "Insufficient balance for deployment");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy KKUB (18 decimals)
        ERC20Mock kkub = new ERC20Mock();
        console.log("\n[1/3] KKUB deployed at:", address(kkub));

        // Deploy KBTC (18 decimals)
        ERC20Mock kbtc = new ERC20Mock();
        console.log("[2/3] KBTC deployed at:", address(kbtc));

        // Deploy KUSDT (18 decimals)
        ERC20Mock kusdt = new ERC20Mock();
        console.log("[3/3] KUSDT deployed at:", address(kusdt));

        vm.stopBroadcast();

        // Verification
        console.log("\n===========================================");
        console.log("Deployment Results");
        console.log("===========================================");
        console.log("KKUB  (18 decimals):", address(kkub));
        console.log("KBTC  (18 decimals):", address(kbtc));
        console.log("KUSDT (18 decimals):", address(kusdt));

        // Sanity checks
        require(address(kkub) != address(0), "KKUB deployment failed");
        require(address(kbtc) != address(0), "KBTC deployment failed");
        require(address(kusdt) != address(0), "KUSDT deployment failed");

        console.log("\n[OK] All 3 mock tokens deployed successfully!");

        console.log("\n===========================================");
        console.log("Update your .env with:");
        console.log("===========================================");
        console.log("KKUB_ADDRESS=%s", address(kkub));
        console.log("KBTC_ADDRESS=%s", address(kbtc));
        console.log("KUSDT_ADDRESS=%s", address(kusdt));
        console.log("===========================================");
    }

    function _parsePrivateKey(string memory privateKeyString) internal pure returns (uint256) {
        if (bytes(privateKeyString)[0] == '0' && bytes(privateKeyString)[1] == 'x') {
            return vm.parseUint(privateKeyString);
        } else {
            return vm.parseUint(string(abi.encodePacked("0x", privateKeyString)));
        }
    }
}