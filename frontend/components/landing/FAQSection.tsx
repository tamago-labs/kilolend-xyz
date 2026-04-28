"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is KiloLend v.2?",
    answer:
      "KiloLend v.2 is an AI-curated isolated lending protocol on KUB Chain. It provides a new risk model where each vault operates independently, eliminating contagion risk from shared liquidity pools.",
  },
  {
    question: "What is isolated lending?",
    answer:
      "Unlike traditional lending protocols with shared pools, KiloLend v.2 uses isolated markets for each vault. This means if one market has issues, it won't affect other markets or users — zero contagion.",
  },
  {
    question: "What are AI-curated vaults?",
    answer:
      "AI-curated vaults use artificial intelligence to optimize liquidity allocation and yield strategies. This enables better capital efficiency and adaptive yield optimization based on market conditions.",
  },
  {
    question: "What are KILO Points?",
    answer:
      "KILO Points are rewards earned by users who test KiloLend v.2 on the KUB Chain Testnet. Help us evaluate and improve the protocol before mainnet launch!",
  },
  {
    question: "Is this testnet or mainnet?",
    answer:
      "KiloLend v.2 is currently live on KUB Chain Testnet with mock tokens. Mainnet is coming soon. This is your chance to explore the protocol and earn KILO Points.",
  },
  // {
  //   question: "Is KiloLend safe to use?",
  //   answer:
  //     "KiloLend v.2 is built with security-first architecture. The isolated risk model actually provides better protection against systemic failures. All smart contracts are audited and open source.",
  // },
  // {
  //   question: "What tokens are supported?",
  //   answer:
  //     "On testnet, we support USDT, USDC, WETH, WBTC, and more. The isolated market model allows for permissionless market creation, so new tokens can be added easily.",
  // },
  {
    question: "How do I get started?",
    answer:
      "Connect your wallet to the KUB Chain Testnet, get test tokens from our faucet, then start supplying or borrowing. Earn KILO Points while you test!",
  },
];

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="px-8 py-20 bg-white border-t border-[#e2e8f0]">
      <div className="max-w-[800px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-[32px] font-bold text-[#1e293b] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-[18px] text-[#475569]">
            Everything you need to know about KiloLend.
          </p>
        </div>

        {/* FAQ List */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-[#e2e8f0] rounded-xl overflow-hidden transition-all"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-[#f8fafc] transition-colors cursor-pointer"
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              >
                <span className="text-base font-semibold text-[#1e293b] pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  size={20}
                  className="text-[#64748b] flex-shrink-0 transition-transform duration-200"
                  style={{
                    transform:
                      openIndex === index
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                  }}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-0">
                  <p className="text-sm leading-relaxed text-[#475569]">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
