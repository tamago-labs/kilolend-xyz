"use client";

import { MarketTable } from "@/components/markets/MarketTable";

export default function MarketsPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] pt-8">
      <div className="max-w-[1200px] mx-auto px-8">
        <h1 className="text-3xl font-bold text-[#1e293b] mb-2">Markets</h1>
        <p className="text-[#64748b] mb-8">Supply tokens to earn interest</p>
      </div>
      <MarketTable mode="supply" />
    </main>
  );
}