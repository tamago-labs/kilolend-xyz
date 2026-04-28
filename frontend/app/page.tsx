import { HeroSection } from "@/components/landing/HeroSection";
import { MarketSection } from "@/components/landing/MarketSection";
import { ComparisonTableSection } from "@/components/landing/ComparisonTableSection";
import { DemoVideoSection } from "@/components/landing/DemoVideoSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { WelcomeModal } from "@/components/landing/WelcomeModal";

export default function Home() {
  return (
    <>
      <WelcomeModal />
      <HeroSection />
      <MarketSection />
      <ComparisonTableSection />
      <DemoVideoSection />
      <FAQSection />
    </>
  );
}
