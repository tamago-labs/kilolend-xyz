"use client";

import { useAccount } from "wagmi";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import Image from "next/image";
import { TestnetTokenConfig } from "@/config/tokens";
import { useMintToken } from "@/hooks/useMintToken";
import { useTestnetTokenContext } from "@/contexts/TestnetTokenContext";
import { usePriceContext } from "@/contexts/PriceContext";

interface TokenCardProps {
  tokenKey: string;
  token: TestnetTokenConfig;
}

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

export const TokenCard = ({ tokenKey, token }: TokenCardProps) => {
  const { isConnected } = useAccount();
  const { mint, isWritePending, isConfirming, isSuccess, error, txHash } =
    useMintToken(tokenKey);
  const { actions: tokenActions } = useTestnetTokenContext();
  const { actions: priceActions } = usePriceContext();

  const formattedBalance = tokenActions.getFormattedBalance(tokenKey);
  const mintStatus = tokenActions.getMintStatus(tokenKey);
  const priceData = priceActions.getPrice(token.priceSource);
  const formattedPrice = priceActions.getFormattedPrice(token.priceSource);
  const { text: changeText, isPositive } = priceActions.getFormattedChange(
    token.priceSource
  );

  const isMinting = isWritePending || isConfirming;

  // Calculate USD value using real price
  const balanceNum = parseFloat(formattedBalance.replace(/,/g, '')) || 0;
  const price = priceData?.price ?? token.fallbackPrice;
  const usdValue = balanceNum * price;

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] hover:shadow-lg hover:-translate-y-1 transition-all">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: `${token.color}15` }}
        >
          <Image
            src={token.iconUrl}
            alt={token.symbol}
            width={32}
            height={32}
            className="object-contain"
            unoptimized
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#1e293b]">{token.symbol}</h3>
          <p className="text-sm text-[#64748b]">{token.name}</p>
        </div>
        {priceData?.isFallback && (
          <span className="text-[10px] px-2 py-0.5 bg-[#fef3c7] text-[#92400e] rounded-full font-medium">
            Est. Price
          </span>
        )}
      </div>

      {/* Price & Balance */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-[#64748b] mb-1">Price</p>
          <p className="text-base font-semibold text-[#1e293b]">
            {formattedPrice}
          </p>
          <p
            className={`text-xs font-medium mt-0.5 ${
              isPositive ? "text-[#06C755]" : "text-[#ef4444]"
            }`}
          >
            {changeText}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#64748b] mb-1">Your Balance</p>
          <p className="text-base font-semibold text-[#1e293b]">
            {isConnected ? formattedBalance : "—"}
          </p>
          {isConnected && (
            <p className="text-xs text-[#64748b] mt-0.5">
              ≈ {formatUSD(usdValue)}
            </p>
          )}
        </div>
      </div>

      {/* Mint Section */}
      <div className="border-t border-[#e2e8f0] pt-4">
        {/* Mint Button */}
        <button
          onClick={() => mint(token.defaultMintAmount)}
          disabled={!isConnected || isMinting}
          className="w-full h-12 flex items-center justify-center gap-2 text-white bg-[#06c755] rounded-xl border-none text-base font-bold cursor-pointer transition-all hover:bg-[#05b54e] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(6,199,85,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {isMinting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {isConfirming ? "Confirming..." : "Minting..."}
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 size={18} />
              Minted!
            </>
          ) : !isConnected ? (
            "Connect Wallet to Mint"
          ) : (
            <>Mint {token.defaultMintAmount} {token.symbol}</>
          )}
        </button>

        {/* Status Messages */}
        {mintStatus === "error" && (
          <div className="flex items-start gap-2 mt-3">
            <AlertCircle size={14} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#ef4444]">
              {error instanceof Error ? error.message : "Transaction failed"}
            </p>
          </div>
        )}
        {txHash && (
          <div className="flex justify-center mt-3">
            <a
              href={`https://testnet.kubscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#06C755] hover:underline"
            >
              View on KubScan
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
