import { HeroSection } from "@/components/landing/HeroSection";
import { MarketSection } from "@/components/landing/MarketSection";
import { ComparisonTableSection } from "@/components/landing/ComparisonTableSection";
import { OpenClawSkillsCTASection } from "@/components/landing/OpenClawSkillsCTASection";
import { DemoVideoSection } from "@/components/landing/DemoVideoSection";
import { FAQSection } from "@/components/landing/FAQSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <MarketSection />
      <ComparisonTableSection />
      <OpenClawSkillsCTASection />
      <DemoVideoSection />
      <FAQSection />
    </>
  );
}