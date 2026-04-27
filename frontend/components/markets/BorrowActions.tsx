"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { Loader2 } from "lucide-react";
import { MarketConfig, MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI, ERC20_ABI } from "@/config/abi";

type TabType = "deposit" | "borrow" | "repay" | "withdrawCollateral";

interface BorrowActionsProps {
  marketId: `0x${string}`;
  marketConfig: MarketConfig;
  marketParams: any;
  marketData?: any;
  refetchMarketData?: () => void;
}

export const BorrowActions = ({ marketId, marketConfig, marketParams, marketData, refetchMarketData }: BorrowActionsProps) => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const collateralToken = marketConfig.collateralToken;
  const loanToken = marketConfig.loanToken;
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

  // Read user collateral balance
  const { data: collateralBalance, refetch: refetchCollateralBalance } = useReadContract({
    address: collateralToken.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
  });

  // Read user loan token balance
  const { data: loanTokenBalance, refetch: refetchLoanTokenBalance } = useReadContract({
    address: loanToken.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
  });

  // Read collateral allowance for Morpho
  const { data: collateralAllowance, refetch: refetchCollateralAllowance } = useReadContract({
    address: collateralToken.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? zeroAddress, MORPHO_ADDRESS],
  });

  // Read loan token allowance for Morpho (needed for repay)
  const { data: loanTokenAllowance, refetch: refetchLoanTokenAllowance } = useReadContract({
    address: loanToken.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? zeroAddress, MORPHO_ADDRESS],
  });

  // Read user position (borrow shares and collateral)
  const { data: position, refetch: refetchPosition } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "position",
    args: [marketId, address ?? zeroAddress],
  });

  // Write contract for approve
  const { data: approveHash, writeContract: writeApprove } = useWriteContract();

  // Wait for approval
  const { isLoading: isApprovePending, isSuccess: isApproveTxSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Write contract for actions
  const { data: actionHash, writeContract, isPending: isActionPending, error: writeError } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: actionHash,
  });

  // Refetch balances when approval succeeds
  useEffect(() => {
    if (isApproveTxSuccess && approveHash) {
      setIsApproving(false);
      refetchCollateralAllowance();
      refetchLoanTokenAllowance();
      refetchCollateralBalance();
      refetchLoanTokenBalance();
    }
  }, [isApproveTxSuccess, approveHash, refetchCollateralAllowance, refetchLoanTokenAllowance, refetchCollateralBalance, refetchLoanTokenBalance]);

  // Handle tx success
  useEffect(() => {
    if (isTxSuccess && actionHash) {
      setIsSuccess(true);
      setAmount("");
      setTxHash(actionHash);
      refetchCollateralBalance();
      refetchLoanTokenBalance();
      refetchPosition();
      refetchMarketData?.();
      setTimeout(() => {
        setIsSuccess(false);
        setTxHash(null);
      }, 3000);
    }
  }, [isTxSuccess, actionHash, refetchCollateralBalance, refetchLoanTokenBalance, refetchPosition, refetchMarketData]);

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
  // Collateral is stored as assets directly
  const depositedCollateral = position
    ? formatUnits(position.collateral, collateralToken.decimals)
    : "0";

  // Borrow shares -> borrow assets
  const borrowShares = position ? BigInt(position.borrowShares.toString()) : BigInt(0);
  const totalBorrowAssets = marketData ? BigInt(marketData.totalBorrowAssets.toString()) : BigInt(0);
  const totalBorrowShares = marketData ? BigInt(marketData.totalBorrowShares.toString()) : BigInt(0);
  
  // Handle division by zero properly
  let borrowedAssets: bigint;
  if (!marketData || totalBorrowShares === BigInt(0)) {
    // Market doesn't exist OR first borrower (no shares yet) - fall back to shares directly
    borrowedAssets = borrowShares;
  } else {
    borrowedAssets = (borrowShares * totalBorrowAssets) / totalBorrowShares;
  }
  
  const borrowedAmountFormatted = formatUnits(borrowedAssets, loanToken.decimals);

  // --- Balance display ---
  const collateralBalanceFormatted = collateralBalance
    ? formatUnits(collateralBalance, collateralToken.decimals)
    : "0";

  const loanTokenBalanceFormatted = loanTokenBalance
    ? formatUnits(loanTokenBalance, loanToken.decimals)
    : "0";

  // --- Amount parsing ---
  const activeTokenDecimals = (activeTab === "deposit" || activeTab === "withdrawCollateral")
    ? collateralToken.decimals
    : loanToken.decimals;
  const parsedAmount = amount ? parseUnits(amount, activeTokenDecimals) : BigInt(0);

  // --- Approval logic ---
  const currentAllowance = (activeTab === "deposit")
    ? collateralAllowance
    : (activeTab === "repay")
      ? loanTokenAllowance
      : undefined;

  const hasAllowance = currentAllowance !== undefined && currentAllowance >= parsedAmount && parsedAmount > BigInt(0);
  const needsApproval = (activeTab === "deposit" || activeTab === "repay") && amount && parseFloat(amount) > 0 && !hasAllowance;

  const handleMax = () => {
    switch (activeTab) {
      case "deposit":
        setAmount(collateralBalanceFormatted);
        break;
      case "borrow":
        setAmount(loanTokenBalanceFormatted);
        break;
      case "repay":
        // Max repay = min(wallet balance, borrowed amount)
        setAmount(borrowedAmountFormatted);
        break;
      case "withdrawCollateral":
        setAmount(depositedCollateral);
        break;
    }
  };

  const handleApprove = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsApproving(true);
    setError(null);

    const approveToken = (activeTab === "deposit")
      ? collateralToken.address
      : loanToken.address;

    writeApprove({
      address: approveToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [MORPHO_ADDRESS, maxUint256],
    });
  };

  const handleAction = () => {
    if (!amount || parseFloat(amount) <= 0 || !marketParams) return;

    // Ensure marketParams is properly formatted
    const params = {
      loanToken: marketParams.loanToken,
      collateralToken: marketParams.collateralToken,
      oracle: marketParams.oracle,
      irm: marketParams.irm,
      lltv: marketParams.lltv,
    };

    const zeroAmount = BigInt(0);
    const emptyData = "0x" as `0x${string}`;

    switch (activeTab) {
      case "deposit":
        writeContract({
          address: MORPHO_ADDRESS,
          abi: MORPHO_ABI,
          functionName: "supplyCollateral",
          args: [
            params.collateralToken,
            parsedAmount,
            address ?? zeroAddress,
            emptyData,
          ],
        });
        break;

      case "borrow": {
        const borrowAmount = parseUnits(amount, loanToken.decimals);
        writeContract({
          address: MORPHO_ADDRESS,
          abi: MORPHO_ABI,
          functionName: "borrow",
          args: [
            params,
            borrowAmount,
            zeroAmount,
            address ?? zeroAddress,
            address ?? zeroAddress,
          ],
        });
        break;
      }

      case "repay": {
        const repayAmount = parseUnits(amount, loanToken.decimals);
        writeContract({
          address: MORPHO_ADDRESS,
          abi: MORPHO_ABI,
          functionName: "repay",
          args: [
            params,
            repayAmount,
            zeroAmount,
            address ?? zeroAddress,
            emptyData,
          ],
        });
        break;
      }

      case "withdrawCollateral":
        writeContract({
          address: MORPHO_ADDRESS,
          abi: MORPHO_ABI,
          functionName: "withdrawCollateral",
          args: [
            params.collateralToken,
            parsedAmount,
            address ?? zeroAddress,
            address ?? zeroAddress,
          ],
        });
        break;
    }
  };

  // --- Button labels ---
  const actionLabel = {
    deposit: `Deposit ${collateralToken.symbol}`,
    borrow: `Borrow ${loanToken.symbol}`,
    repay: `Repay ${loanToken.symbol}`,
    withdrawCollateral: `Withdraw ${collateralToken.symbol}`,
  }[activeTab];

  const pendingLabel = {
    deposit: "Depositing...",
    borrow: "Borrowing...",
    repay: "Repaying...",
    withdrawCollateral: "Withdrawing...",
  }[activeTab];

  const approveLabel = (activeTab === "deposit")
    ? `Approve ${collateralToken.symbol}`
    : `Approve ${loanToken.symbol}`;

  const balanceLabel = {
    deposit: { label: "Wallet Balance", value: `${collateralBalanceFormatted} ${collateralToken.symbol}` },
    borrow: { label: "Wallet Balance", value: `${loanTokenBalanceFormatted} ${loanToken.symbol}` },
    repay: { label: "Borrowed Amount", value: `${borrowedAmountFormatted} ${loanToken.symbol}` },
    withdrawCollateral: { label: "Deposited Collateral", value: `${depositedCollateral} ${collateralToken.symbol}` },
  }[activeTab];

  const isLoading = isApproving || isApprovePending || isActionPending || isConfirming;
  const isParamsLoading = marketParams === undefined;

  const tabs: { key: TabType; label: string }[] = [
    { key: "deposit", label: "Deposit" },
    { key: "borrow", label: "Borrow" },
    { key: "repay", label: "Repay" },
    { key: "withdrawCollateral", label: "Withdraw" },
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
        <span className="text-[#64748b]">{balanceLabel.label}</span>
        <span className="font-medium text-[#1e293b]">{balanceLabel.value}</span>
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
              {isApprovePending ? "Confirming..." : "Approving..."}
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : (
            approveLabel
          )}
        </button>
      ) : (
        <button
          onClick={handleAction}
          disabled={!isConnected || isLoading || !amount || parseFloat(amount) <= 0}
          className="w-full h-14 bg-[#06C755] hover:bg-[#05b54e] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isActionPending || isConfirming ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {isConfirming ? "Confirming..." : pendingLabel}
            </>
          ) : isSuccess ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Success!
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : (
            actionLabel
          )}
        </button>
      )}
    </div>
  );
};