"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { TestnetBanner } from "@/components/testnet-tokens/TestnetBanner";
import { TokenGrid } from "@/components/testnet-tokens/TokenGrid";

export default function TestnetTokensPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        badge="Testnet"
        title="Testnet Tokens"
        subtitle="Get test tokens to evaluate KiloLend's new isolated lending markets and earn KILO points."
      />
      <TestnetBanner />
      <TokenGrid />
    </main>
  );
}