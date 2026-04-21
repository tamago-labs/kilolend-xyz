"use client";

import { useState } from "react";
import { Play } from "lucide-react";

export const DemoVideoSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section id="demo" className="px-8 py-20 bg-[#f1f5f9]">
      <div className="max-w-[1000px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-[32px] font-bold text-[#1e293b] mb-4">
            See It In Action
          </h2>
          <p className="text-[18px] text-[#475569] max-w-[600px] mx-auto">
            Watch how AI agents interact with KiloLend to execute autonomous
            DeFi strategies.
          </p>
        </div>

        {/* Video Container */}
        <div className="relative rounded-2xl overflow-hidden bg-[#1e293b] aspect-video shadow-2xl">
          {isPlaying ? (
            <video
              autoPlay
              controls
              className="w-full h-full object-cover"
              poster="/images/poster-desktop.png"
            >
              <source src="/videos/kilolend-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
              className="w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer group relative"
            >
              {/* Poster Background */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: "url(/images/poster-desktop.png)",
                }}
              />
              {/* Play Button */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-[#06C755] flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_40px_rgba(6,199,85,0.4)]">
                <Play size={32} className="text-white ml-1" fill="white" />
              </div>
              <span className="relative z-10 text-white text-lg font-semibold">
                Watch Demo Video
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};