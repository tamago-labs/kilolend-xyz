import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GoogleAnalytics } from '@next/third-parties/google'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KiloLend — The AI-curated liquidity engine",
  description:
    "An AI-curated liquidity engine built on isolated money markets. Eliminate contagion risk and unlock autonomous yield on KUB Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f1f5f9]">
        <Providers>
          <Header />
          <main className="flex-1 flex flex-col w-full">{children}</main>
          <Footer />
        </Providers>
      </body>
      <GoogleAnalytics gaId="G-QNBVXZZR9E" />
    </html>
  );
}
