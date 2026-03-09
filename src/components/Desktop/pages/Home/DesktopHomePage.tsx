"use client";

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { HeroSection } from './components/HeroSection';
import { MarketSection } from './components/MarketSection';
import { ComparisonTableSection } from './components/ComparisonTableSection';
import { OpenClawSkillsCTASection } from './components/OpenClawSkillsCTASection';
import { DemoVideoSection } from './components/DemoVideoSection';
import { FAQSection } from './components/FAQSection'; 
import { useRouter } from 'next/navigation';
import { LineMiniDAppModal, DesktopAIAgentModal } from '../../modals';
import { useModalStore } from '@/stores/modalStore';

const HomeContainer = styled.div`
  min-height: 100vh;
  background: #f8fafc;
`;

const MainContent = styled.main` 
  margin: 0 auto;
  padding: 32px;
`;

export const DesktopHome = () => {
  const [mounted, setMounted] = useState(false);
  const { openModal, closeModal, activeModal } = useModalStore();
  const router = useRouter()

  useEffect(() => {
    setMounted(true);
  }, []);

 

  if (!mounted) return null;

  return (
    <HomeContainer>
      <MainContent>
        <HeroSection />

        <MarketSection />

        <ComparisonTableSection/>

        <OpenClawSkillsCTASection/>

        <DemoVideoSection/>

        <FAQSection/>

      </MainContent> 

      <LineMiniDAppModal
        isOpen={activeModal === 'lineMiniDApp'}
        onClose={() => closeModal()}
      />
      
      <DesktopAIAgentModal
        isOpen={activeModal === 'ai-agent'}
        onClose={() => closeModal()}
      />
    </HomeContainer>
  );
};
