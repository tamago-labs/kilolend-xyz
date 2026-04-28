"use client";

import { MarketTable } from "@/components/markets/MarketTable";
import { PageHeader } from "@/components/shared/PageHeader";

export default function BorrowPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        badge="KUB Chain"
        title="Borrow Markets"
        subtitle="Borrow tokens against your collateral and earn KILO points"
      />
      <MarketTable mode="borrow" />
    </main>
  );
}
