"use client";

import { useReadContract, useAccount } from "wagmi";
import Image from "next/image";
import { formatUnits } from "viem";
import { MarketConfig, MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI } from "@/config/abi";

interface MarketInfoProps {
  marketId: `0x${string}`;
  marketConfig: MarketConfig;
  marketData: any;
  marketParams: any;
  refetchMarketData?: () => void;
}

export const MarketInfo = ({ marketId, marketConfig, marketData, marketParams }: MarketInfoProps) => {
  const { address } = useAccount();
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
  
  const loanToken = marketConfig.loanToken;

  // Read user position
  const { data: position, refetch: refetchPosition } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "position",
    args: [marketId, address ?? zeroAddress],
  });

  // Calculate user supply value (convert shares to assets)
  const supplyShares = position ? BigInt(position.supplyShares.toString()) : BigInt(0);
  const totalSupplyAssets = marketData ? BigInt(marketData.totalSupplyAssets.toString()) : BigInt(0);
  const totalSupplyShares = marketData ? BigInt(marketData.totalSupplyShares.toString()) : BigInt(0);
  
  // Handle division by zero properly
  let supplyAssets: bigint;
  if (!marketData || totalSupplyShares === BigInt(0)) {
    // Market doesn't exist OR first depositor (no shares yet) - fall back to shares directly
    supplyAssets = supplyShares;
  } else {
    supplyAssets = (supplyShares * totalSupplyAssets) / totalSupplyShares;
  }
  
  const userSupply = formatUnits(supplyAssets, loanToken.decimals);

  // Calculate utilization rate
  const totalSupply = marketData
    ? formatUnits(BigInt(marketData.totalSupplyAssets.toString()), loanToken.decimals)
    : "—";
  const totalBorrow = marketData
    ? formatUnits(BigInt(marketData.totalBorrowAssets.toString()), loanToken.decimals)
    : "—";
  
  const totalSupplyRaw = marketData ? BigInt(marketData.totalSupplyAssets.toString()) : BigInt(0);
  const totalBorrowRaw = marketData ? BigInt(marketData.totalBorrowAssets.toString()) : BigInt(0);
  const utilization = totalSupplyRaw > BigInt(0)
    ? (Number(totalBorrowRaw) / Number(totalSupplyRaw)) * 100
    : 0;

  // Get IRM address for borrow rate
  const irmAddress = marketParams?.irm as `0x${string}` | undefined;

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
      <h3 className="text-lg font-bold text-[#1e293b] mb-6">Position Details</h3>
      
      {/* User Position */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-[#64748b]">Your Supply</span>
          <span className="font-semibold text-[#1e293b]">
            {parseFloat(userSupply).toFixed(4)} {loanToken.symbol}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#64748b]">Your Position Value</span>
          <span className="font-semibold text-[#06C755]">
            ${parseFloat(userSupply).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Market Stats */}
      <div className="border-t border-[#e2e8f0] pt-4">
        <h4 className="text-sm font-semibold text-[#64748b] mb-3">Market Stats</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Total Supply</span>
            <span className="font-medium text-[#1e293b]">{totalSupply} {loanToken.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Total Borrow</span>
            <span className="font-medium text-[#1e293b]">{totalBorrow} {loanToken.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Utilization</span>
            <span className="font-medium text-[#1e293b]">{utilization.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Market Info */}
      <div className="border-t border-[#e2e8f0] pt-4 mt-4">
        <h4 className="text-sm font-semibold text-[#64748b] mb-3">Market Info</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Loan Token</span>
            <div className="flex items-center gap-2">
              <Image
                src={loanToken.iconUrl}
                alt={loanToken.symbol}
                width={20}
                height={20}
                className="object-contain"
                unoptimized
              />
              <span className="font-medium text-[#1e293b]">{loanToken.symbol}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Collateral</span>
            <div className="flex items-center gap-2">
              <Image
                src={marketConfig.collateralToken.iconUrl}
                alt={marketConfig.collateralToken.symbol}
                width={20}
                height={20}
                className="object-contain"
                unoptimized
              />
              <span className="font-medium text-[#1e293b]">{marketConfig.collateralToken.symbol}</span>
            </div>
          </div>
          {marketParams && (
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">LLTV</span>
              <span className="font-medium text-[#1e293b]">
                {Math.round(Number(formatUnits(BigInt(marketParams.lltv.toString()), 18)) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};