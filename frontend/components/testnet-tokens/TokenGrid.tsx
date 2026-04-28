"use client";

import { KUB_TESTNET_TOKENS } from "@/config/tokens";
import { TokenCard } from "./TokenCard";

export const TokenGrid = () => {
  const tokenEntries = Object.entries(KUB_TESTNET_TOKENS);

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokenEntries.map(([key, token]) => (
          <TokenCard key={key} tokenKey={key} token={token} />
        ))}
      </div>
    </div>
  );
};