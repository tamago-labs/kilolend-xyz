"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react"; 
 

export const HeroSection = () => {
  // Mock stats for now - real TVL and APY will come from market data
  const avgSupplyAPY = 4.2;
  const avgBorrowAPR = 6.8;

  return (
    <section className="bg-white border-b border-[#e2e8f0] px-8 pt-28 pb-24">
      <div className="max-w-[1200px] mx-auto flex flex-row items-center justify-between gap-12 max-[768px]:flex-col max-[768px]:gap-8">
        {/* Left Content */}
        <div className="flex flex-col gap-6 max-w-[600px]">
          <h1 className="text-[42px] leading-tight font-bold text-[#1e293b] max-[768px]:text-[32px]">
            The Capital Layer
            <br />
            <span className="text-[#06C755]">Without Contagion</span>
          </h1>
          <p className="text-[18px] leading-relaxed text-[#475569]">
            The first AI-curated liquidity engine on KUB Chain. No cascading failures. Just deep, autonomous yield.
          </p>
          <div className="flex gap-4 mt-2 max-[768px]:flex-col max-[768px]:w-full">
            <Link
              href="/markets"
              className="flex items-center justify-center gap-2 bg-[#06c755] text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#05b54e] hover:-translate-y-0.5 transition-all hover:shadow-[0_4px_12px_rgba(6,199,85,0.3)] max-[768px]:w-full"
            >
              Start Lending
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/#demo"
              className="flex items-center justify-center gap-2 bg-white text-[#06C755] border-2 border-[#06C755] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#06C755] hover:text-white hover:-translate-y-0.5 transition-all max-[768px]:w-full"
            >
              Watch Demo
            </Link>
          </div>
        </div>

        {/* Right Visual */}
        <div className="flex flex-col items-center gap-6">
          <div className="bg-[#f1f5f9] rounded-2xl p-8 flex flex-col items-center gap-6 max-w-[480px] w-full">
            <Image
              src="/images/icon-kilo.png"
              alt="KiloLend"
              width={80}
              height={80}
            />
            <div className="grid grid-cols-3 gap-4 w-full">
              <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm">
                <span className="text-sm text-[#64748b]">Supply</span>
                <span className="text-lg font-bold text-[#1e293b]">{avgSupplyAPY}%</span>
                <span className="text-xs text-[#06C755]">APY</span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm">
                <span className="text-sm text-[#64748b]">Borrow</span>
                <span className="text-lg font-bold text-[#1e293b]">{avgBorrowAPR}%</span>
                <span className="text-xs text-[#ef4444]">APR</span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm">
                <span className="text-sm text-[#64748b]">Agents</span>
                <span className="text-lg font-bold text-[#1e293b]">1</span>
                <span className="text-xs text-[#06C755]">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
