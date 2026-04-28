"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";

export const Footer = () => {
  return (
    <footer className="bg-[#1e293b] text-[#e2e8f0] px-8 pt-20 pb-8">
      <div className="max-w-[1400px] mx-auto grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-12 max-[1200px]:grid-cols-[1fr_1fr_1fr] max-[1200px]:gap-8 max-[768px]:grid-cols-[1fr] max-[768px]:gap-6">
        {/* Brand Section */}
        <div className="flex flex-col gap-4">
          <Image
            src="/images/kilolend-logo-desktop.png"
            alt="KiloLend"
            width={232}
            height={78}
            className="mb-2"
          />
          <p className="text-sm leading-relaxed text-[#94a3b8] max-w-[320px]">
            An isolated capital layer on KUB Chain, enabling AI-curated liquidity without shared risk
          </p>
          {/* <a
            href="https://v1.kilolend.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#06C755] hover:text-[#05b54e] transition-colors mt-2"
          >
            KiloLend v.1
            <ExternalLink size={14} />
          </a> */}
        </div>

        {/* Product Links */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-white mb-2">Product</h3>
          <a
            href="/markets"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            Lending Markets
          </a>
          <a
            href="/portfolio"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            Portfolio
          </a>
          <a
            href="/kilo-points"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            Kilo Points
          </a>
          <a
            href="https://v1.kilolend.xyz"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            KiloLend v.1
          </a>
        </div>

        {/* Resources */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-white mb-2">Resources</h3>
          <a
            href="https://docs.kilolend.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed flex items-center gap-2"
          >
            Documentation
            <ExternalLink size={14} />
          </a>
          <a
            href="https://docs.kilolend.xyz/developer-resources/community-audit-report"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed flex items-center gap-2"
          >
            Audit Report
            <ExternalLink size={14} />
          </a>
          <a
            href="https://medium.com/kilolend/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed flex items-center gap-2"
          >
            Blog
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Community */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-white mb-2">Community</h3>
          <a
            href="https://x.com/kilolend_xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            Twitter/X
          </a>
          <a
            href="https://lin.ee/r8bOhDU"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            LINE Official
          </a>
          <a
            href="https://discord.gg/BDQnjcHbnj"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            Discord
          </a>
          <a
            href="https://github.com/tamago-labs/kilolend"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            GitHub
          </a>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-white mb-2">Legal</h3>
          <a
            href="/terms"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors leading-relaxed"
          >
            Privacy Policy
          </a>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="max-w-[1400px] mx-auto mt-12 pt-8 border-t border-[#334155] flex justify-between items-center max-[768px]:flex-col max-[768px]:gap-4 max-[768px]:text-center">
        <p className="text-sm text-[#64748b]">
          © 2026 KiloLend. All rights reserved.
        </p>
        <div className="flex gap-6 max-[768px]:flex-col max-[768px]:gap-2">
          <a
            href="/terms"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors"
          >
            Terms
          </a>
          <a
            href="/privacy"
            className="text-sm text-[#94a3b8] hover:text-[#06C755] transition-colors"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
};
