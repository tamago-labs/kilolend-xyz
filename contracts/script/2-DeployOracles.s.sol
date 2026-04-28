// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PriceOracle} from "../src/PriceOracle.sol";

/**
 * @title DeployOracles
 * @notice Deploy 3 PriceOracle contracts for the lending markets
 *         All oracles use fallback mode (mode 0) with hardcoded USD prices
 *
 * Markets:
 *   1. KUSDT (loan) <> KKUB (collateral)   — KKUB=$0.9,  KUSDT=$1.0
 *   2. KKUB  (loan) <> KUSDT (collateral)  — KUSDT=$1.0, KKUB=$0.9
 *   3. KBTC  (loan) <> KUSDT (collateral)  — KUSDT=$1.0, KBTC=$75,000
 *
 * @dev Usage:
 *   forge script script/2-DeployOracles.s.sol --rpc-url $RPC_URL --broadcast --legacy
 *
 *   Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 */
contract DeployOracles is Script {

    // Token addresses  
    address kkubAddress;
    address kbtcAddress;
    address kusdtAddress;

    // Prices in USD, scaled by 1e18
    uint256 constant KKUB_USD_PRICE  = 0.9e18;     // $0.90
    uint256 constant KBTC_USD_PRICE  = 75_000e18;   // $75,000
    uint256 constant KUSDT_USD_PRICE = 1e18;        // $1.00

    // All tokens have 18 decimals
    uint8 constant DECIMALS_18 = 18;

    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);

        // Read token addresses from env
        kkubAddress  = 0x3eF520aA55f9d4C74479038C47F41B4037e2Ba6D;
        kbtcAddress  = 0x4bea1aB3cC3D53Ca234cd5f73d3A0D1B13462Faa;
        kusdtAddress = 0xa263b2d40648e0AF6A0C11DCe40e9bc810C14cAE;

        console.log("===========================================");
        console.log("Deploy Price Oracles (Fallback Mode)");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("KKUB  address:", kkubAddress);
        console.log("KBTC  address:", kbtcAddress);
        console.log("KUSDT address:", kusdtAddress);
        console.log("===========================================");

        require(kkubAddress  != address(0), "KKUB_ADDRESS not set");
        require(kbtcAddress  != address(0), "KBTC_ADDRESS not set");
        require(kusdtAddress != address(0), "KUSDT_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // Oracle 1: KUSDT (loan) <> KKUB (collateral)
        //   collateralPrice = KKUB = $0.9,  loanPrice = KUSDT = $1.0
        PriceOracle oracle1 = new PriceOracle(
            kusdtAddress,       // loanToken
            kkubAddress,        // collateralToken
            KKUB_USD_PRICE,     // initialCollateralUsdPrice ($0.9)
            KUSDT_USD_PRICE,    // initialLoanUsdPrice ($1.0)
            DECIMALS_18,        // loanTokenDecimals (KUSDT)
            DECIMALS_18         // collateralTokenDecimals (KKUB)
        );
        console.log("\n[1/3] Oracle (KUSDT/KKUB) deployed at:", address(oracle1));

        // Oracle 2: KKUB (loan) <> KUSDT (collateral)
        //   collateralPrice = KUSDT = $1.0, loanPrice = KKUB = $0.9
        PriceOracle oracle2 = new PriceOracle(
            kkubAddress,        // loanToken
            kusdtAddress,       // collateralToken
            KUSDT_USD_PRICE,    // initialCollateralUsdPrice ($1.0)
            KKUB_USD_PRICE,     // initialLoanUsdPrice ($0.9)
            DECIMALS_18,        // loanTokenDecimals (KKUB)
            DECIMALS_18         // collateralTokenDecimals (KUSDT)
        );
        console.log("[2/3] Oracle (KKUB/KUSDT) deployed at:", address(oracle2));

        // Oracle 3: KBTC (loan) <> KUSDT (collateral)
        //   collateralPrice = KUSDT = $1.0, loanPrice = KBTC = $75,000
        PriceOracle oracle3 = new PriceOracle(
            kbtcAddress,        // loanToken
            kusdtAddress,       // collateralToken
            KUSDT_USD_PRICE,    // initialCollateralUsdPrice ($1.0)
            KBTC_USD_PRICE,     // initialLoanUsdPrice ($75,000)
            DECIMALS_18,        // loanTokenDecimals (KBTC)
            DECIMALS_18         // collateralTokenDecimals (KUSDT)
        );
        console.log("[3/3] Oracle (KBTC/KUSDT) deployed at:", address(oracle3));

        vm.stopBroadcast();

        // Verification
        console.log("\n===========================================");
        console.log("Oracle Deployment Results");
        console.log("===========================================");
        console.log("Oracle 1 (KUSDT loan / KKUB collateral):", address(oracle1));
        console.log("Oracle 2 (KKUB loan / KUSDT collateral):", address(oracle2));
        console.log("Oracle 3 (KBTC loan / KUSDT collateral):", address(oracle3));

        // Sanity checks
        require(address(oracle1) != address(0), "Oracle 1 deployment failed");
        require(address(oracle2) != address(0), "Oracle 2 deployment failed");
        require(address(oracle3) != address(0), "Oracle 3 deployment failed");

        console.log("\n[OK] All 3 oracles deployed successfully!");

        console.log("\n===========================================");
        console.log("Update your .env with:");
        console.log("===========================================");
        console.log("ORACLE_KUSDT_KKUB_ADDRESS=%s", address(oracle1));
        console.log("ORACLE_KKUB_KUSDT_ADDRESS=%s", address(oracle2));
        console.log("ORACLE_KBTC_KUSDT_ADDRESS=%s", address(oracle3));
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