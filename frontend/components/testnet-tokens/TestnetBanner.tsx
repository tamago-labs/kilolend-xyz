"use client";

import { Info } from "lucide-react";

export const TestnetBanner = () => {
  return (
    <div className="max-w-[1200px] mx-auto px-8 mt-8">
      <div className="flex items-start gap-3 bg-[#f0fdf4] border border-[#06C755]/20 rounded-xl px-5 py-4">
        <Info size={20} className="text-[#06C755] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[#1e293b]">
            KUB Chain Testnet
          </p>
          <p className="text-sm text-[#475569] mt-1">
            These are mock tokens with no real value. Connect your wallet to get started.
          </p>
        </div>
      </div>
    </div>
  );
};