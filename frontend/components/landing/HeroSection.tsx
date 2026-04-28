"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { V2Banner } from "@/components/landing/V2Banner";

export const HeroSection = () => {
  return (
    <section className="bg-white border-b border-[#e2e8f0] px-8 pt-28">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-row items-center justify-between gap-12 pb-24 max-[768px]:flex-col max-[768px]:gap-8">
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
              <a
                href="/#comparison-table"
                className="flex items-center justify-center gap-2 bg-white text-[#06C755] border-2 border-[#06C755] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#06C755] hover:text-white hover:-translate-y-0.5 transition-all max-[768px]:w-full"
              >
                Why V.2
              </a>
            </div>
          </div>

          {/* Right Visual - Vault Selector Mockup */}
          <div className="relative w-[420px] max-[768px]:w-full">
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-lg shadow-[#06C755]/5 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#64748b]">
                  Lending Vault
                </span>
                <div className="flex items-center gap-1 bg-[#06C755]/10 text-[#06C755] text-xs px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-[#06C755] rounded-full animate-pulse" />
                  Live
                </div>
              </div>

              {/* From Section */}
              <div className="bg-[#f8fafc] rounded-xl p-4 mb-3">
                <span className="text-xs text-[#64748b] mb-2 block">You Supply</span>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="0.00"
                    className="text-3xl font-bold bg-transparent outline-none text-[#1e293b] w-full"
                    defaultValue="10,000"
                  />
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#e2e8f0]">
                    <img
                      src="https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png"
                      alt="KUB" 
                      className="rounded-full w-[24px] h-[24px]"
                    />
                    <span className="font-medium text-[#1e293b]">KUB</span>
                    <ChevronDown size={16} className="text-[#64748b]" />
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center -my-1 relative z-10">
                <div className="w-8 h-8 bg-white border border-[#e2e8f0] rounded-full flex items-center justify-center shadow-sm">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M6 10l-2-2m2 2l2-2" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* To Section */}
              <div className="bg-[#f0fdf4] rounded-xl p-4 border border-[#06C755]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#64748b]">You Receive</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#06C755]">4.82%</span>
                    <span className="text-sm text-[#64748b]">APY</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#06C755]/10 px-3 py-2 rounded-lg">
                    <span className="font-medium text-[#06C755]">+500 KILO Points</span>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-[#e2e8f0]">
                <div className="flex-1 text-center">
                  <div className="text-xs text-[#64748b]">Daily Yield</div>
                  <div className="text-sm font-semibold text-[#1e293b]">$1.32</div>
                </div>
                <div className="w-px bg-[#e2e8f0]" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-[#64748b]">7D Volume</div>
                  <div className="text-sm font-semibold text-[#1e293b]">$2.4M</div>
                </div>
                <div className="w-px bg-[#e2e8f0]" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-[#64748b]">Risk</div>
                  <div className="text-sm font-semibold text-[#06C755]">Low</div>
                </div>
              </div>
            </div>
          </div>
        </div>
         
      </div>
    </section>
  );
};
