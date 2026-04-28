"use client";

import { MarketTable } from "@/components/markets/MarketTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { V2Banner } from "@/components/landing/V2Banner";

export default function MarketsPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        badge="KUB Chain"
        title="Supply Markets"
        subtitle="Supply tokens to earn interest and KILO points"
      />
      <MarketTable mode="supply" />
      <V2Banner />
    </main>
  );
}
