"use client";

import { MarketTable } from "@/components/markets/MarketTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { V2Banner } from "@/components/landing/V2Banner";

export default function BorrowPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        badge="KUB Chain"
        title="Borrow Markets"
        subtitle="Borrow tokens against your collateral and earn KILO points"
      />
      <MarketTable mode="borrow" />
      <V2Banner />
    </main>
  );
}
