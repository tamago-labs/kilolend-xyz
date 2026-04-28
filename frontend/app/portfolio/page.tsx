"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  DashboardTab,
  SupplyPositionsTab,
  BorrowPositionsTab,
  WalletBalanceTab,
  PortfolioSidebar,
  type TabType,
} from "@/components/portfolio";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  if (!isConnected || !address) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <PageHeader
          badge="Portfolio"
          title="My Portfolio"
          subtitle="Track your wallet, supplies, and borrows"
        />
        <div className="max-w-[1200px] mx-auto px-8 py-16">
          <div className="text-center py-16">
            <Wallet size={64} className="mx-auto text-[#64748b] mb-4" />
            <h1 className="text-2xl font-bold text-[#1e293b] mb-2">Connect Your Wallet</h1>
            <p className="text-[#64748b]">Please connect your wallet to view your portfolio.</p>
          </div>
        </div>
      </main>
    );
  }

  const tabTitles: Record<TabType, string> = {
    dashboard: "Dashboard",
    supply: "Supply Positions",
    borrow: "Borrow Positions",
    wallet: "Wallet Balance",
  };

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        badge="Portfolio"
        title="My Portfolio"
        subtitle="Track your wallet, supplies, and borrows"
      />

      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Tabs */}
          <PortfolioSidebar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
              {/* Tab Header */}
              <div className="px-6 py-4 border-b border-[#e2e8f0]">
                <h2 className="text-lg font-bold text-[#1e293b]">
                  {tabTitles[activeTab]}
                </h2>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "dashboard" && <DashboardTab />}
                {activeTab === "supply" && <SupplyPositionsTab />}
                {activeTab === "borrow" && <BorrowPositionsTab />}
                {activeTab === "wallet" && <WalletBalanceTab address={address} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
