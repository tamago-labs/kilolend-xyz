import Image from "next/image";
import { ArrowRight } from "lucide-react";

export const OpenClawSkillsCTASection = () => {
  return (
    <section
      id="openclaw-skills"
      className="px-8 py-20 bg-gradient-to-br from-[#06C755]/5 to-[#06C755]/10 border-y border-[#06C755]/20"
    >
      <div className="max-w-[1200px] mx-auto flex flex-row items-center gap-16 max-[768px]:flex-col max-[768px]:gap-8">
        {/* Left Visual */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-10 shadow-lg max-w-[400px] w-full flex flex-col items-center gap-6">
            <Image
              src="/images/kilolend-logo.png"
              alt="OpenClaw Skills"
              width={120}
              height={120}
            />
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#1e293b] mb-2">
                OpenClaw Skills
              </h3>
              <p className="text-sm text-[#64748b]">
                Connect your AI agent to KiloLend
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <div className="bg-[#f1f5f9] rounded-lg px-4 py-3 text-sm text-[#475569] flex items-center gap-3">
                <span className="text-[#06C755]">●</span> Supply & Borrow
              </div>
              <div className="bg-[#f1f5f9] rounded-lg px-4 py-3 text-sm text-[#475569] flex items-center gap-3">
                <span className="text-[#06C755]">●</span> Swap & Trade
              </div>
              <div className="bg-[#f1f5f9] rounded-lg px-4 py-3 text-sm text-[#475569] flex items-center gap-3">
                <span className="text-[#06C755]">●</span> Portfolio Management
              </div>
              <div className="bg-[#f1f5f9] rounded-lg px-4 py-3 text-sm text-[#475569] flex items-center gap-3">
                <span className="text-[#06C755]">●</span> Market Analysis
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex flex-col gap-6">
          <h2 className="text-[32px] font-bold text-[#1e293b] leading-tight">
            Give Your AI Agent
            <br />
            <span className="text-[#06C755]">DeFi Superpowers</span>
          </h2>
          <p className="text-[18px] leading-relaxed text-[#475569]">
            OpenClaw Skills let any AI agent interact with KiloLend's
            lending markets, DEX, and portfolio tools through our MCP server.
            No custom integrations needed.
          </p>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-start gap-3">
              <span className="text-[#06C755] text-xl mt-0.5">⚡</span>
              <div>
                <h4 className="font-semibold text-[#1e293b]">
                  One-Click Setup
                </h4>
                <p className="text-sm text-[#64748b]">
                  Connect your agent wallet and start executing strategies in
                  minutes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#06C755] text-xl mt-0.5">🔌</span>
              <div>
                <h4 className="font-semibold text-[#1e293b]">
                  MCP Server Built-In
                </h4>
                <p className="text-sm text-[#64748b]">
                  Full Model Context Protocol support for Claude, GPT, and
                  other LLM agents.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#06C755] text-xl mt-0.5">🛡️</span>
              <div>
                <h4 className="font-semibold text-[#1e293b]">
                  Safe & Permissioned
                </h4>
                <p className="text-sm text-[#64748b]">
                  Control exactly what your agent can do with granular
                  permissions.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-4 max-[768px]:flex-col max-[768px]:w-full">
            <a
              href="https://docs.kilolend.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#06c755] text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#05b54e] hover:-translate-y-0.5 transition-all hover:shadow-[0_4px_12px_rgba(6,199,85,0.3)] max-[768px]:w-full"
            >
              Get Started
              <ArrowRight size={20} />
            </a>
            <a
              href="https://github.com/tamago-labs/kilolend"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white text-[#06C755] border-2 border-[#06C755] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#06C755] hover:text-white hover:-translate-y-0.5 transition-all max-[768px]:w-full"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};