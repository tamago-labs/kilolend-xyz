// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {Morpho} from "../src/Morpho.sol";
import {KYCRegistry} from "../src/KYCRegistry.sol";
import {JumpRateIrm} from "../src/irm/JumpRateIrm.sol";
import {MarketParams, Id} from "../src/interfaces/IMorpho.sol";
import {MarketParamsLib} from "../src/libraries/MarketParamsLib.sol";

/**
 * @title DeployMarkets
 * @notice Deploy Morpho, KYCRegistry, 2 JumpRateIrms and create 3 lending markets
 *
 * Interest Rate Models:
 *   - Low-rate IRM:  KUSDT/KKUB market (base 1%, slope 8%, jump 100%, kink 80%)
 *   - Normal-rate IRM: KKUB/KUSDT + KBTC/KUSDT markets (base 2%, slope 15%, jump 200%, kink 80%)
 *
 * Markets (all with 75% LLTV):
 *   1. KUSDT (loan) <> KKUB (collateral)   — low-rate IRM
 *   2. KKUB  (loan) <> KUSDT (collateral)  — normal-rate IRM
 *   3. KBTC  (loan) <> KUSDT (collateral)  — normal-rate IRM
 *
 * @dev Usage:
 *   forge script script/3-DeployMarkets.s.sol --rpc-url $RPC_URL --broadcast --legacy
 *
 *   Environment variables:
 *   - PRIVATE_KEY: Deployer private key
 */
contract DeployMarkets is Script {

    // LLTV: 75% = 0.75 * 1e18
    uint256 constant LLTV = 0.75e18;

    // ─── Low-rate IRM (stablecoin market: KUSDT/KKUB) ─────────────────────
    // At 0% utilization: 1% APR
    // At kink (80%):     1% + 8% = 9% APR
    // At 100% utilization: 9% + 100% * 20% = 29% APR
    uint256 constant LOW_BASE_RATE_PER_YEAR      = 0.01e18;   // 1%
    uint256 constant LOW_MULTIPLIER_PER_YEAR     = 0.08e18;   // 8%
    uint256 constant LOW_JUMP_MULTIPLIER_PER_YEAR = 1e18;     // 100%
    uint256 constant LOW_KINK                     = 0.80e18;  // 80%

    // ─── Normal-rate IRM (volatile markets: KKUB/KUSDT, KBTC/KUSDT) ───────
    // At 0% utilization: 2% APR
    // At kink (80%):     2% + 15% = 17% APR
    // At 100% utilization: 17% + 200% * 20% = 57% APR
    uint256 constant NORMAL_BASE_RATE_PER_YEAR       = 0.02e18;   // 2%
    uint256 constant NORMAL_MULTIPLIER_PER_YEAR      = 0.15e18;   // 15%
    uint256 constant NORMAL_JUMP_MULTIPLIER_PER_YEAR = 2e18;      // 200%
    uint256 constant NORMAL_KINK                      = 0.80e18;  // 80%

    // Token addresses
    address kkubAddress;
    address kbtcAddress;
    address kusdtAddress;

    // Oracle addresses
    address oracleKusdtKkub;
    address oracleKkubKusdt;
    address oracleKbtcKusdt;

    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
 
        kkubAddress  = 0x3eF520aA55f9d4C74479038C47F41B4037e2Ba6D;
        kbtcAddress  = 0x4bea1aB3cC3D53Ca234cd5f73d3A0D1B13462Faa;
        kusdtAddress = 0xa263b2d40648e0AF6A0C11DCe40e9bc810C14cAE;
 
        oracleKusdtKkub  = 0x5d03E2e40992194097989c4E73A31cb5a488d774;
        oracleKkubKusdt  = 0x98Ff3CA8a4be71dD2de3062B18e2041BdF935A5A;
        oracleKbtcKusdt  = 0x73CBbc445eec7d0B4dB68486Da71170103A8015c;

        console.log("===========================================");
        console.log("Deploy Markets (Morpho + IRM + Create Markets)");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("===========================================");

        // Validate env vars
        require(kkubAddress  != address(0), "KKUB_ADDRESS not set");
        require(kbtcAddress  != address(0), "KBTC_ADDRESS not set");
        require(kusdtAddress != address(0), "KUSDT_ADDRESS not set");
        require(oracleKusdtKkub != address(0), "ORACLE_KUSDT_KKUB_ADDRESS not set");
        require(oracleKkubKusdt != address(0), "ORACLE_KKUB_KUSDT_ADDRESS not set");
        require(oracleKbtcKusdt != address(0), "ORACLE_KBTC_KUSDT_ADDRESS not set");

        console.log("Tokens:");
        console.log("  KKUB: ", kkubAddress);
        console.log("  KBTC: ", kbtcAddress);
        console.log("  KUSDT:", kusdtAddress);
        console.log("Oracles:");
        console.log("  KUSDT/KKUB:", oracleKusdtKkub);
        console.log("  KKUB/KUSDT:", oracleKkubKusdt);
        console.log("  KBTC/KUSDT:", oracleKbtcKusdt);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Morpho
        Morpho morpho = new Morpho(deployer);
        console.log("\n[1/6] Morpho deployed at:", address(morpho));

        // 2. Deploy KYCRegistry
        KYCRegistry kycRegistry = new KYCRegistry(deployer);
        console.log("[2/6] KYCRegistry deployed at:", address(kycRegistry));

        // 3. Set KYC registry on Morpho
        morpho.setKYCRegistry(address(kycRegistry));
        console.log("[3/6] KYCRegistry set on Morpho");

        // 4. Deploy JumpRateIrm (low-rate) for KUSDT/KKUB market
        JumpRateIrm irmLow = new JumpRateIrm(
            LOW_BASE_RATE_PER_YEAR,
            LOW_MULTIPLIER_PER_YEAR,
            LOW_JUMP_MULTIPLIER_PER_YEAR,
            LOW_KINK
        );
        morpho.enableIrm(address(irmLow));
        console.log("[4/6] Low-rate IRM deployed and enabled at:", address(irmLow));

        // 5. Deploy JumpRateIrm (normal-rate) for KKUB/KUSDT + KBTC/KUSDT markets
        JumpRateIrm irmNormal = new JumpRateIrm(
            NORMAL_BASE_RATE_PER_YEAR,
            NORMAL_MULTIPLIER_PER_YEAR,
            NORMAL_JUMP_MULTIPLIER_PER_YEAR,
            NORMAL_KINK
        );
        morpho.enableIrm(address(irmNormal));
        console.log("[5/6] Normal-rate IRM deployed and enabled at:", address(irmNormal));

        // 6. Enable LLTV
        morpho.enableLltv(LLTV);
        console.log("[6/6] LLTV 75%% enabled");

        // Create Market 1: KUSDT (loan) <> KKUB (collateral) — low-rate IRM
        MarketParams memory market1 = MarketParams({
            loanToken: kusdtAddress,
            collateralToken: kkubAddress,
            oracle: oracleKusdtKkub,
            irm: address(irmLow),
            lltv: LLTV
        });
        morpho.createMarket(market1);
        Id marketId1 = MarketParamsLib.id(market1);
        console.log("\n[Market 1] KUSDT/KKUB created");
        console.log("  Market ID:", vm.toString(Id.unwrap(marketId1)));

        // Create Market 2: KKUB (loan) <> KUSDT (collateral) — normal-rate IRM
        MarketParams memory market2 = MarketParams({
            loanToken: kkubAddress,
            collateralToken: kusdtAddress,
            oracle: oracleKkubKusdt,
            irm: address(irmNormal),
            lltv: LLTV
        });
        morpho.createMarket(market2);
        Id marketId2 = MarketParamsLib.id(market2);
        console.log("[Market 2] KKUB/KUSDT created");
        console.log("  Market ID:", vm.toString(Id.unwrap(marketId2)));

        // Create Market 3: KBTC (loan) <> KUSDT (collateral) — normal-rate IRM
        MarketParams memory market3 = MarketParams({
            loanToken: kbtcAddress,
            collateralToken: kusdtAddress,
            oracle: oracleKbtcKusdt,
            irm: address(irmNormal),
            lltv: LLTV
        });
        morpho.createMarket(market3);
        Id marketId3 = MarketParamsLib.id(market3);
        console.log("[Market 3] KBTC/KUSDT created");
        console.log("  Market ID:", vm.toString(Id.unwrap(marketId3)));

        vm.stopBroadcast();

        // Final Summary
        console.log("\n===========================================");
        console.log("Deployment Summary");
        console.log("===========================================");
        console.log("Morpho:       ", address(morpho));
        console.log("KYCRegistry:  ", address(kycRegistry));
        console.log("IRM (low-rate):   ", address(irmLow));
        console.log("IRM (normal-rate):", address(irmNormal));
        console.log("");
        console.log("Market 1 (KUSDT/KKUB) ID:", vm.toString(Id.unwrap(marketId1)));
        console.log("Market 2 (KKUB/KUSDT) ID:", vm.toString(Id.unwrap(marketId2)));
        console.log("Market 3 (KBTC/KUSDT) ID:", vm.toString(Id.unwrap(marketId3)));
        console.log("");
        console.log("[OK] All markets created successfully!");

        console.log("\n===========================================");
        console.log("Update your .env with:");
        console.log("===========================================");
        console.log("MORPHO_ADDRESS=%s", address(morpho));
        console.log("KYC_REGISTRY_ADDRESS=%s", address(kycRegistry));
        console.log("IRM_LOW_RATE_ADDRESS=%s", address(irmLow));
        console.log("IRM_NORMAL_RATE_ADDRESS=%s", address(irmNormal));
        console.log("MARKET_KUSDT_KKUB_ID=%s", vm.toString(Id.unwrap(marketId1)));
        console.log("MARKET_KKUB_KUSDT_ID=%s", vm.toString(Id.unwrap(marketId2)));
        console.log("MARKET_KBTC_KUSDT_ID=%s", vm.toString(Id.unwrap(marketId3)));
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