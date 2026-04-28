"use client";

import { LayoutDashboard, TrendingUp, AlertTriangle, Wallet } from "lucide-react";

export type TabType = "dashboard" | "supply" | "borrow" | "wallet";

const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { key: "supply", label: "Supply", icon: <TrendingUp size={18} /> },
  { key: "borrow", label: "Borrow", icon: <AlertTriangle size={18} /> },
  { key: "wallet", label: "Wallet", icon: <Wallet size={18} /> },
];

interface PortfolioSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function PortfolioSidebar({ activeTab, onTabChange }: PortfolioSidebarProps) {
  return (
    <div className="w-56 shrink-0">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-2 sticky top-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left ${
              activeTab === tab.key
                ? "bg-[#06C755] text-white"
                : "text-[#64748b] hover:bg-[#f8fafc]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { tabs };
