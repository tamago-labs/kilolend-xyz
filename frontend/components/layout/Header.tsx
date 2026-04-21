"use client";

import { useState } from "react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, Menu, X, Wallet, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const Header = () => {
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      <header className="flex justify-between items-center px-4 md:px-8 bg-white border-b border-[#e2e8f0] sticky top-0 z-50 h-[72px] w-full">
        {/* Left Section */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Desktop Logo */}
          <Link href="/" className="hidden md:flex items-center cursor-pointer">
            <Image
              src="/images/kilolend-logo-desktop.png"
              alt="KiloLend"
              width={154}
              height={52}
              className="mb-1"
            />
          </Link>
          {/* Mobile Logo (Text) */}
          <Link href="/" className="md:hidden flex items-center cursor-pointer">
            <span className="text-xl font-bold italic text-[#06C755]">KiloLend</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6">
            <Link
              href="/markets"
              className="text-base font-medium text-[#64748b] hover:text-[#1e293b] transition-colors"
            >
              Markets
            </Link>
            <Link
              href="/borrow"
              className="text-base font-medium text-[#64748b] hover:text-[#1e293b] transition-colors"
            >
              Borrow
            </Link>
            <Link
              href="/portfolio"
              className="text-base font-medium text-[#64748b] hover:text-[#1e293b] transition-colors"
            >
              Portfolio
            </Link>

            {/* More Dropdown */}
            <div className="relative">
              <button
                className="text-base font-medium text-[#64748b] hover:text-[#1e293b] transition-colors flex items-center gap-1"
                onClick={() => setShowNavDropdown(!showNavDropdown)}
              >
                More
                <ChevronDown
                  size={16}
                  className="transition-transform duration-200"
                  style={{
                    transform: showNavDropdown
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  }}
                />
              </button>
              {showNavDropdown && (
                <div className="absolute top-full left-0 bg-white border border-[#e2e8f0] rounded-xl shadow-lg p-3 min-w-[200px] z-[100] mt-2">
                  <Link
                    href="/leaderboard"
                    className="block px-4 py-3 rounded-lg text-sm text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                    onClick={() => setShowNavDropdown(false)}
                  >
                    KILO Points
                  </Link>
                  <Link
                    href="/testnet-tokens"
                    className="block px-4 py-3 rounded-lg text-sm text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                    onClick={() => setShowNavDropdown(false)}
                  >
                    Testnet Tokens
                  </Link>
                  <a
                    href="https://v1.kilolend.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 rounded-lg text-sm text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                    onClick={() => setShowNavDropdown(false)}
                  >
                    KiloLend v.1
                  </a>
                  <a
                    href="https://docs.kilolend.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 rounded-lg text-sm text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                    onClick={() => setShowNavDropdown(false)}
                  >
                    Documentation
                  </a>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Section - Custom Styled Connect Button */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:block">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                  <div {...(!ready && { 'aria-hidden': true, 'style': { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                    {!connected ? (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="flex items-center justify-center min-w-[140px] md:min-w-[280px] h-12 text-white bg-[#06c755] rounded-xl border-none text-base md:text-lg font-bold cursor-pointer transition-all hover:bg-[#05b54e] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(6,199,85,0.3)]"
                      >
                        Connect
                      </button>
                    ) : chain.unsupported ? (
                      <button
                        onClick={openChainModal}
                        type="button"
                        className="flex items-center justify-center min-w-[140px] h-12 px-4 text-white bg-[#ef4444] rounded-xl border-none text-base font-bold cursor-pointer"
                      >
                        Wrong network
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#f1f5f9] rounded-xl">
                          <Wallet size={18} className="text-[#06C755]" />
                          <span className="text-sm font-medium text-[#1e293b]">
                            {shortenAddress(account.address)}
                          </span>
                        </div>
                        <button
                          onClick={openAccountModal}
                          className="flex items-center justify-center w-12 h-12 text-[#64748b] hover:text-[#ef4444] hover:bg-[#fef2f2] rounded-xl transition-colors"
                          title="Account"
                        >
                          <Wallet size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#f1f5f9] transition-colors"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setShowMobileMenu(false)}
            />
            {/* Mobile Menu Drawer */}
            <div className="absolute top-[72px] left-0 right-0 bg-white border-b border-[#e2e8f0] shadow-lg z-50 md:hidden">
              <nav className="flex flex-col p-4 gap-2">
                <Link
                  href="/markets"
                  className="px-4 py-3 rounded-lg text-base font-medium text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Markets
                </Link>
                <Link
                  href="/borrow"
                  className="px-4 py-3 rounded-lg text-base font-medium text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Borrow
                </Link>
                <Link
                  href="/portfolio"
                  className="px-4 py-3 rounded-lg text-base font-medium text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Portfolio
                </Link>
                <hr className="my-2 border-[#e2e8f0]" />
                <Link
                  href="/leaderboard"
                  className="px-4 py-3 rounded-lg text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  KILO Points
                </Link>
                <Link
                  href="/testnet-tokens"
                  className="px-4 py-3 rounded-lg text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Testnet Tokens
                </Link>
                <a
                  href="https://docs.kilolend.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-lg text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Documentation
                </a>
                <hr className="my-2 border-[#e2e8f0]" />
                {/* Mobile Connect Button */}
                <div className="py-2">
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openAccountModal,
                      openChainModal,
                      openConnectModal,
                      authenticationStatus,
                      mounted,
                    }) => {
                      const ready = mounted && authenticationStatus !== 'loading';
                      const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                      return (
                        <div {...(!ready && { 'aria-hidden': true, 'style': { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                          {!connected ? (
                            <button
                              onClick={() => {
                                openConnectModal();
                                setShowMobileMenu(false);
                              }}
                              type="button"
                              className="w-full h-12 text-white bg-[#06c755] rounded-xl border-none text-lg font-bold cursor-pointer transition-all hover:bg-[#05b54e]"
                            >
                              Connect
                            </button>
                          ) : chain.unsupported ? (
                            <button
                              onClick={() => {
                                openChainModal();
                                setShowMobileMenu(false);
                              }}
                              type="button"
                              className="w-full h-12 text-white bg-[#ef4444] rounded-xl border-none text-lg font-bold cursor-pointer"
                            >
                              Wrong network
                            </button>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 px-4 py-2 bg-[#f1f5f9] rounded-xl">
                                <Wallet size={18} className="text-[#06C755]" />
                                <span className="text-sm font-medium text-[#1e293b]">
                                  {shortenAddress(account.address)}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  openAccountModal();
                                  setShowMobileMenu(false);
                                }}
                                className="flex items-center justify-center w-10 h-10 text-[#64748b] hover:text-[#ef4444] hover:bg-[#fef2f2] rounded-xl transition-colors"
                              >
                                <Wallet size={20} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              </nav>
            </div>
          </>
        )}
      </header>
    </>
  );
};