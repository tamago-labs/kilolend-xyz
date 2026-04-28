"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const WelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if modal was shown in the last 24 hours
    const lastShown = localStorage.getItem('kilolend_welcome_modal_shown');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (!lastShown || (now - parseInt(lastShown)) > oneDay) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem('kilolend_welcome_modal_shown', now.toString());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#64748b] hover:text-[#1e293b] transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Logo */}
          <div className="mb-6">
            <Image
              src="/images/kilolend-logo.png"
              alt="KiloLend"
              width={154}
              height={52}
              className="mx-auto"
            />
          </div>
          
          <h2 className="text-2xl font-bold text-[#1e293b] mb-3">
            KiloLend v.2 Now Live
          </h2>
          
          <p className="text-[#64748b] mb-4 leading-relaxed text-sm"> 
            <br />
            Experience the new AI-curated isolated risk lending with better rates, and zero contagion risk.
            {` `}
            <span className="text-[#06C755] font-medium">Earn KILO Points</span> while you explore and help us evaluate the protocol before mainnet launch.
           {/* <br /><br />
            <span className="text-xs text-[#94a3b8]">Mainnet coming soon. Stay tuned!</span>*/}
          </p>

          {/* Buttons in same row */}
          <div className="flex gap-3 mt-6">
            <Link
              href="https://v1.kilolend.xyz"
              target="_blank"
              className="flex-1 flex items-center justify-center gap-2 bg-[#f1f5f9] text-[#475569] px-4 py-3 rounded-xl font-medium hover:bg-[#e2e8f0] transition-colors text-sm"
            >
              Go to KiloLend v.1
            </Link>
            <button
              onClick={handleClose}
              className="flex-1 flex items-center justify-center gap-2 bg-[#06C755] text-white px-4 py-3 rounded-xl font-bold hover:bg-[#05b54e] transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
