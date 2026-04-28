"use client";

import Link from "next/link";
import { TrendingUp, Wallet, ChevronRight } from "lucide-react";
import { KUB_TESTNET_TOKENS } from "@/config/tokens";
import { usePriceContext } from "@/contexts/PriceContext";

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

export function DashboardTab() {
  const { actions: priceActions } = usePriceContext();
  const tokens = Object.values(KUB_TESTNET_TOKENS);

  // Calculate total wallet value using real prices
  const totalWalletValue = tokens.reduce((sum, token) => {
    const priceData = priceActions.getPrice(token.priceSource);
    const price = priceData?.price ?? token.fallbackPrice;
    // For dashboard, we show the price value (balance would need wallet connection)
    return sum + price;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-[#06C755] to-[#05a347] rounded-2xl p-6 text-white">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-sm opacity-80 mb-1">Total Wallet Balance</p>
            <p className="text-2xl font-bold">{formatUSD(totalWalletValue)}</p>
          </div>
          <div>
            <p className="text-sm opacity-80 mb-1">Total Supply</p>
            <p className="text-2xl font-bold">{formatUSD(0)}</p>
          </div>
          <div>
            <p className="text-sm opacity-80 mb-1">Total Borrow</p>
            <p className="text-2xl font-bold">{formatUSD(0)}</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/markets" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#e2e8f0] hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] flex items-center justify-center">
            <TrendingUp size={24} className="text-[#06C755]" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[#1e293b]">Supply Assets</p>
            <p className="text-sm text-[#64748b]">Earn interest on your assets</p>
          </div>
          <ChevronRight size={20} className="text-[#64748b]" />
        </Link>
        <Link href="/borrow" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#e2e8f0] hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center">
            <Wallet size={24} className="text-[#ef4444]" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[#1e293b]">Borrow Assets</p>
            <p className="text-sm text-[#64748b]">Use your collateral to borrow</p>
          </div>
          <ChevronRight size={20} className="text-[#64748b]" />
        </Link>
      </div>
    </div>
  );
}
