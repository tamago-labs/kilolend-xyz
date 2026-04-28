"use client";

import Image from "next/image";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { KUB_TESTNET_TOKENS } from "@/config/tokens";
import { ERC20_ABI } from "@/config/abi";

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

function TokenBalanceRow({ 
  symbol, 
  balance, 
  decimals, 
  iconUrl, 
  price 
}: { 
  symbol: string; 
  balance: bigint; 
  decimals: number; 
  iconUrl: string; 
  price: number;
}) {
  const balanceNum = Number(formatUnits(balance, decimals));
  const usdValue = balanceNum * price;

  return (
    <div className="flex items-center justify-between py-4 border-b border-[#e2e8f0] last:border-b-0">
      <div className="flex items-center gap-3">
        <Image src={iconUrl} alt={symbol} width={40} height={40} className="rounded-full" unoptimized />
        <div>
          <p className="font-bold text-[#1e293b]">{symbol}</p>
          <p className="text-xs text-[#64748b]">{balanceNum.toFixed(4)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-[#1e293b]">{formatUSD(usdValue)}</p>
        <p className="text-xs text-[#64748b]">${price.toFixed(2)}</p>
      </div>
    </div>
  );
}

function TokenBalanceWithData({
  address,
  token,
}: {
  address: `0x${string}`;
  token: (typeof KUB_TESTNET_TOKENS)[keyof typeof KUB_TESTNET_TOKENS];
}) {
  const { data: balance } = useReadContract({
    address: token.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  });

  return (
    <TokenBalanceRow
      symbol={token.symbol}
      balance={balance ?? 0n}
      decimals={token.decimals}
      iconUrl={token.iconUrl}
      price={token.fallbackPrice}
    />
  );
}

export function WalletBalanceTab({ address }: { address: `0x${string}` }) {
  const tokens = Object.values(KUB_TESTNET_TOKENS);

  return (
    <div className="divide-y divide-[#e2e8f0]">
      {tokens.map((token) => (
        <TokenBalanceWithData
          key={token.symbol}
          address={address}
          token={token}
        />
      ))}
    </div>
  );
}
