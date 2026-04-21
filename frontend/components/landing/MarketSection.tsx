import Link from "next/link";
import { ArrowRight } from "lucide-react";

const placeholderMarkets = [
  {
    symbol: "USDT",
    name: "Tether USD",
    totalSupply: "$2,450,000",
    totalBorrow: "$1,820,000",
    supplyAPY: "4.20%",
    borrowAPR: "6.80%",
    utilization: "74.3%",
  },
  {
    symbol: "IRONCLAW",
    name: "IronClaw Token",
    totalSupply: "$890,000",
    totalBorrow: "$534,000",
    supplyAPY: "3.50%",
    borrowAPR: "5.20%",
    utilization: "60.0%",
  },
  {
    symbol: "WHSK",
    name: "Wrapped HSK",
    totalSupply: "$1,200,000",
    totalBorrow: "$780,000",
    supplyAPY: "2.80%",
    borrowAPR: "4.50%",
    utilization: "65.0%",
  },
];

export const MarketSection = () => {
  return (
    <section className="px-8 py-20 bg-[#f1f5f9]">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-[32px] font-bold text-[#1e293b] mb-4">
            Lending Markets
          </h2>
          <p className="text-[18px] text-[#475569] max-w-[600px] mx-auto">
            Supply assets to earn yield or borrow against your collateral.
            Agent-ready from day one.
          </p>
        </div>

        {/* Market Cards Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 mb-8">
          {placeholderMarkets.map((market) => (
            <div
              key={market.symbol}
              className="bg-white rounded-2xl p-6 border border-[#e2e8f0] hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            >
              {/* Market Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-sm font-bold text-[#06C755]">
                  {market.symbol.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1e293b]">
                    {market.symbol}
                  </h3>
                  <p className="text-sm text-[#64748b]">{market.name}</p>
                </div>
              </div>

              {/* Market Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Total Supply</p>
                  <p className="text-base font-semibold text-[#1e293b]">
                    {market.totalSupply}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Total Borrow</p>
                  <p className="text-base font-semibold text-[#1e293b]">
                    {market.totalBorrow}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Supply APY</p>
                  <p className="text-base font-semibold text-[#06C755]">
                    {market.supplyAPY}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Borrow APR</p>
                  <p className="text-base font-semibold text-[#ef4444]">
                    {market.borrowAPR}
                  </p>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                <div className="flex justify-between text-xs text-[#64748b] mb-2">
                  <span>Utilization</span>
                  <span>{market.utilization}</span>
                </div>
                <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#06C755] rounded-full transition-all"
                    style={{
                      width: market.utilization,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 text-[#06C755] font-semibold text-lg hover:gap-3 transition-all"
          >
            View All Markets
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
};