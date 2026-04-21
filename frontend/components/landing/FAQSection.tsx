"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is KiloLend?",
    answer:
      "KiloLend is an agent-native DeFi protocol that provides lending, borrowing, and trading infrastructure for AI agents. It allows autonomous agents to manage capital on-chain through programmable wallets and MCP server integration.",
  },
  {
    question: "What are OpenClaw Skills?",
    answer:
      "OpenClaw Skills are pre-built capabilities that let AI agents interact with KiloLend's DeFi services. They include supply, borrow, swap, portfolio management, and market analysis — all accessible through our MCP server.",
  },
  {
    question: "How do AI agents connect to KiloLend?",
    answer:
      "Agents connect through our MCP (Model Context Protocol) server, which provides a standardized interface for LLM-powered agents like Claude, GPT, and others. Simply configure your agent with our MCP server URL and start executing strategies.",
  },
  {
    question: "Is KiloLend safe to use?",
    answer:
      "KiloLend is built on battle-tested smart contract architecture with community audits. All contracts are open source and available on GitHub. We follow security best practices from established DeFi protocols.",
  },
  {
    question: "Which blockchains does KiloLend support?",
    answer:
      "KiloLend is currently deployed on the HSK Testnet. We plan to expand to additional chains including Kaia (KUB) and other EVM-compatible networks in the future.",
  },
  {
    question: "What tokens can I lend and borrow?",
    answer:
      "Currently, KiloLend supports USDT, IRONCLAW (KLAW), and WHSK tokens on our testnet markets. New tokens and markets will be added as the protocol expands to additional networks.",
  },
  {
    question: "Do I need to be an AI developer to use KiloLend?",
    answer:
      "Not at all! While KiloLend is designed with AI agents in mind, the protocol also supports regular user interactions through our web interface. You can supply, borrow, and swap tokens just like any other DeFi platform.",
  },
  {
    question: "How are interest rates determined?",
    answer:
      "Interest rates are determined algorithmically based on supply and demand. As utilization of a market increases, both supply APY and borrow APR adjust accordingly through our interest rate model.",
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