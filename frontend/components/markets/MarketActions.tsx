"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { Loader2 } from "lucide-react";
import { MarketConfig, MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI, ERC20_ABI } from "@/config/abi";

type TabType = "supply" | "withdraw";

interface MarketActionsProps {
  marketId: `0x${string}`;
  marketConfig: MarketConfig;
  marketParams: any;
  marketData?: any;
  refetchMarketData?: () => void;
}

export const MarketActions = ({ marketId, marketConfig, marketParams, marketData, refetchMarketData }: MarketActionsProps) => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("supply");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const loanToken = marketConfig.loanToken;
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

  // Read wallet balance
  const { data: walletBalance, refetch: refetchBalance } = useReadContract({
    address: loanToken.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
  });

  // Read token allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: loanToken.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? zeroAddress, MORPHO_ADDRESS],
  });

  // Read user position
  const { data: position, refetch: refetchPosition } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "position",
    args: [marketId, address ?? zeroAddress],
  });

  // Write contract for approve
  const { data: approveHash, writeContract: writeApprove } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApprovePending, isSuccess: isApproveTxSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Write contract for supply/withdraw
  const { data: supplyHash, writeContract: writeSupply, isPending: isSupplyPending, error: writeError } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: supplyHash,
  });

  // Refetch allowance and balance when approval succeeds
  useEffect(() => {
    if (isApproveTxSuccess && approveHash) {
      setIsApproving(false);
      refetchAllowance();
      refetchBalance();
    }
  }, [isApproveTxSuccess, approveHash, refetchAllowance, refetchBalance]);

  // Handle tx success
  useEffect(() => {
    if (isTxSuccess && supplyHash) {
      setIsSuccess(true);
      setAmount("");
      setTxHash(supplyHash);
      refetchBalance();
      refetchPosition();
      refetchMarketData?.();
      setTimeout(() => {
        setIsSuccess(false);
        setTxHash(null);
      }, 3000);
    }
  }, [isTxSuccess, supplyHash, refetchBalance, refetchPosition, refetchMarketData]);

  // Surface write errors
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message || "Transaction failed";
      const revertMatch = msg.match(/reason: (.+)/);
      setError(revertMatch ? revertMatch[1] : msg);
      setIsApproving(false);
    }
  }, [writeError]);

  // --- Share-to-asset conversion ---
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
  
  const supplyBalance = formatUnits(supplyAssets, loanToken.decimals);

  const walletBalanceFormatted = walletBalance
    ? formatUnits(walletBalance, loanToken.decimals)
    : "0";

  // Amount parsing
  const parsedAmount = amount ? parseUnits(amount, loanToken.decimals) : BigInt(0);
  const hasAllowance = allowance !== undefined && allowance >= parsedAmount && parsedAmount > BigInt(0);
  const needsApproval = activeTab === "supply" && amount && parseFloat(amount) > 0 && !hasAllowance;

  const handleMax = () => {
    if (activeTab === "supply") {
      setAmount(walletBalanceFormatted);
    } else {
      setAmount(supplyBalance);
    }
  };

  const handleApprove = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsApproving(true);
    setError(null);

    writeApprove({
      address: loanToken.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [MORPHO_ADDRESS, maxUint256],
    });
  };

  const handleAction = () => {
    if (!amount || parseFloat(amount) <= 0 || !marketParams || !hasAllowance) return;

    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    // Build marketParams tuple exactly as contract expects
    const params = {
      loanToken: marketParams.loanToken as `0x${string}`,
      collateralToken: marketParams.collateralToken as `0x${string}`,
      oracle: marketParams.oracle as `0x${string}`,
      irm: marketParams.irm as `0x${string}`,
      lltv: BigInt(marketParams.lltv.toString()),
    };

    const zeroShares = BigInt(0);
    const emptyData = "0x" as `0x${string}`;

    if (activeTab === "supply") {
      // Supply assets (not shares), so assets > 0, shares = 0
      writeSupply({
        address: MORPHO_ADDRESS,
        abi: MORPHO_ABI,
        functionName: "supply",
        args: [params, parsedAmount, zeroShares, address, emptyData],
      });
    } else {
      // Withdraw assets (not shares), so assets > 0, shares = 0
      writeSupply({
        address: MORPHO_ADDRESS,
        abi: MORPHO_ABI,
        functionName: "withdraw",
        args: [params, parsedAmount, zeroShares, address, address],
      });
    }
  };

  const isLoading = isApproving || isApprovePending || isSupplyPending || isConfirming;
  const isParamsLoading = marketParams === undefined;

  const tabs: { key: TabType; label: string }[] = [
    { key: "supply", label: "Supply" },
    { key: "withdraw", label: "Withdraw" },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
      {/* Tabs */}
      <div className="flex border-b border-[#e2e8f0] mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setAmount(""); setError(null); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "text-[#06C755] border-b-2 border-[#06C755]"
                : "text-[#64748b] hover:text-[#1e293b]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Balance Info */}
      <div className="flex justify-between text-sm mb-4">
        <span className="text-[#64748b]">
          {activeTab === "supply" ? "Wallet Balance" : "Supply Balance"}
        </span>
        <span className="font-medium text-[#1e293b]">
          {activeTab === "supply"
            ? `${walletBalanceFormatted} ${loanToken.symbol}`
            : `${supplyBalance} ${loanToken.symbol}`}
        </span>
      </div>

      {/* Amount Input */}
      <div className="relative mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full h-14 px-4 pr-16 text-xl border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#06C755]"
        />
        <button
          onClick={handleMax}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#06C755] hover:text-[#05b54e]"
        >
          MAX
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Success Message */}
      {isSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          Transaction successful! ✓
        </div>
      )}

      {/* Action Button */}
      {isParamsLoading ? (
        <button
          disabled
          className="w-full h-14 bg-[#e2e8f0] text-[#64748b] font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          <Loader2 size={18} className="animate-spin" />
          Loading Market...
        </button>
      ) : needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={!isConnected || isLoading || !amount || parseFloat(amount) <= 0}
          className="w-full h-14 bg-[#64748b] hover:bg-[#475569] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving || isApprovePending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Approving...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : (
            `Approve ${loanToken.symbol}`
          )}
        </button>
      ) : (
        <button
          onClick={handleAction}
          disabled={!isConnected || isLoading || !amount || parseFloat(amount) <= 0 || !hasAllowance}
          className="w-full h-14 bg-[#06C755] hover:bg-[#05b54e] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSupplyPending || isConfirming ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {isConfirming ? "Confirming..." : activeTab === "supply" ? "Supplying..." : "Withdrawing..."}
            </>
          ) : isSuccess ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Success!
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : (
            `${activeTab === "supply" ? "Supply" : "Withdraw"} ${loanToken.symbol}`
          )}
        </button>
      )}
    </div>
  );
};