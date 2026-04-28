"use client";

import { MarketTable } from "@/components/markets/MarketTable";
import { PageHeader } from "@/components/shared/PageHeader";

export default function MarketsPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        badge="KUB Chain"
        title="Supply Markets"
        subtitle="Supply tokens to earn interest and KILO points"
      />
      <MarketTable mode="supply" />
    </main>
  );
}
