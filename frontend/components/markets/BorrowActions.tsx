"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { Loader2, Info } from "lucide-react";
import { MarketConfig, MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI, ERC20_ABI } from "@/config/abi";
import { usePriceContext } from "@/contexts/PriceContext";

type CollateralTabType = "deposit" | "withdrawCollateral";
type BorrowTabType = "borrow" | "repay";
type ModeType = "collateral" | "borrow";

// Tooltip component
function Tooltip({ content }: { content: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#e2e8f0] text-[#64748b] hover:bg-[#d1d5db] transition-colors"
      >
        <Info size={12} />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1e293b] text-white text-xs rounded-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]" />
        </div>
      )}
    </div>
  );
}

interface BorrowActionsProps {
  marketId: `0x${string}`;
  marketConfig: MarketConfig;
  marketParams: any;
  marketData?: any;
  refetchMarketData?: () => void;
  mode?: ModeType;
}

export const BorrowActions = ({ marketId, marketConfig, marketParams, marketData, refetchMarketData, mode = "borrow" }: BorrowActionsProps) => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<CollateralTabType | BorrowTabType>(mode === "collateral" ? "deposit" : "borrow");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const collateralToken = marketConfig.collateralToken;
  const loanToken = marketConfig.loanToken;
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

  // Get real prices from price context
  const { actions: priceActions } = usePriceContext();
  const collateralPrice = priceActions.getPrice(collateralToken.priceSource)?.price ?? collateralToken.fallbackPrice;
  const loanPrice = priceActions.getPrice(loanToken.priceSource)?.price ?? loanToken.fallbackPrice;

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
  const depositedCollateral = position
    ? formatUnits(position.collateral, collateralToken.decimals)
    : "0";

  const hasCollateral = position && position.collateral > 0n;

  // Borrow shares -> borrow assets
  const borrowShares = position ? BigInt(position.borrowShares.toString()) : BigInt(0);
  const totalBorrowAssets = marketData ? BigInt(marketData.totalBorrowAssets.toString()) : BigInt(0);
  const totalBorrowShares = marketData ? BigInt(marketData.totalBorrowShares.toString()) : BigInt(0);
  
  let borrowedAssets: bigint;
  if (!marketData || totalBorrowShares === BigInt(0)) {
    borrowedAssets = borrowShares;
  } else {
    borrowedAssets = (borrowShares * totalBorrowAssets) / totalBorrowShares;
  }
  
  const borrowedAmountFormatted = formatUnits(borrowedAssets, loanToken.decimals);

  // --- Calculate how much user can borrow using real prices ---
  const collateralValue = parseFloat(depositedCollateral) * collateralPrice;
  const lltvValue = marketParams ? Number(formatUnits(BigInt(marketParams.lltv.toString()), 18)) : 0;
  const maxBorrowValue = collateralValue * lltvValue;
  const currentBorrowValue = parseFloat(borrowedAmountFormatted) * loanPrice;
  const availableToBorrowValue = Math.max(0, maxBorrowValue - currentBorrowValue);
  
  const availableToBorrow = loanPrice > 0 ? availableToBorrowValue / loanPrice : 0;

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

  // Get current token price for USD display
  const currentTokenPrice = (activeTab === "deposit" || activeTab === "withdrawCollateral")
    ? collateralPrice
    : loanPrice;

  const handleMax = () => {
    switch (activeTab) {
      case "deposit":
        setAmount(collateralBalanceFormatted);
        break;
      case "borrow":
        setAmount(availableToBorrow.toFixed(6));
        break;
      case "repay":
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
            params,
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
            params,
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
  }[activeTab] as string;

  const pendingLabel = {
    deposit: "Depositing...",
    borrow: "Borrowing...",
    repay: "Repaying...",
    withdrawCollateral: "Withdrawing...",
  }[activeTab] as string;

  const approveLabel = (activeTab === "deposit")
    ? `Approve ${collateralToken.symbol}`
    : `Approve ${loanToken.symbol}`;

  // --- Balance label based on mode ---
  const getBalanceLabel = () => {
    if (activeTab === "deposit") {
      return { label: "Wallet Balance", value: `${parseFloat(collateralBalanceFormatted).toFixed(4)} ${collateralToken.symbol}` };
    }
    if (activeTab === "borrow") {
      return { label: "Available to Borrow", value: `${availableToBorrow.toFixed(4)} ${loanToken.symbol}` };
    }
    if (activeTab === "repay") {
      return { label: "Borrowed Amount", value: `${parseFloat(borrowedAmountFormatted).toFixed(4)} ${loanToken.symbol}` };
    }
    return { label: "Deposited Collateral", value: `${parseFloat(depositedCollateral).toFixed(4)} ${collateralToken.symbol}` };
  };

  const balanceLabel = getBalanceLabel();

  const isLoading = isApproving || isApprovePending || isActionPending || isConfirming;
  const isParamsLoading = marketParams === undefined;

  // Tabs based on mode
  const tabs = mode === "collateral"
    ? [
        { key: "deposit" as const, label: "Deposit" },
        { key: "withdrawCollateral" as const, label: "Withdraw" },
      ]
    : [
        { key: "borrow" as const, label: "Borrow" },
        { key: "repay" as const, label: "Repay" },
      ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
      {/* Card Title */}
      <h3 className="text-lg font-bold text-[#1e293b] mb-4 flex items-center gap-2">
        {mode === "collateral" ? "Collateral" : "Borrow / Repay"}
        {mode === "collateral" && (
          <Tooltip content="Deposit collateral to enable borrowing. Withdraw unused collateral anytime." />
        )}
        {mode === "borrow" && (
          <Tooltip content="Borrow assets using your deposited collateral as security." />
        )}
      </h3>

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
        <span className="text-[#64748b] flex items-center gap-1">
          {balanceLabel.label}
          {balanceLabel.label === "Available to Borrow" && (
            <Tooltip content="Maximum amount you can borrow based on your collateral and LTV." />
          )}
        </span>
        <span className="font-medium text-[#1e293b]">{balanceLabel.value}</span>
      </div>

      {/* Amount Input */}
      <div className="relative mb-2">
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
      
      {/* USD Value */}
      {amount && parseFloat(amount) > 0 && (
        <div className="mb-4 text-sm text-[#64748b]">
          ≈ ${(parseFloat(amount) * currentTokenPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}

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
          className="w-full h-14 bg-[#06C755] hover:bg-[#05b54e] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
