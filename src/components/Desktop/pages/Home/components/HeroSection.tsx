"use client";

import styled from 'styled-components';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChain } from '@/contexts/ChainContext';
import { etherlink } from '@/wagmi_config';
import { Plus } from 'react-feather';

// Hero Section Styles
const HeroSectionWrapper = styled.section` 
  padding: 80px 32px;
  margin-bottom: 48px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
`;

const HeroContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  position: relative;
  z-index: 2;
`;

const HeroContent = styled.div`
  z-index: 2;
`;

const HeroTitle = styled.h1`
  font-size: clamp(36px, 4vw, 48px);
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 24px;
  line-height: 1.2;
`;

const HeroSubtitle = styled.p`
  font-size: 18px;
  color: #64748b;
  margin-bottom: 40px;
  line-height: 1.6;
  max-width: 600px;
`;

const CTAContainer = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, #06C755 0%, #059669 100%);
  color: white;
  border: none;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(6, 199, 85, 0.25);
  min-width: 160px;
  width: 200px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(6, 199, 85, 0.35);
  }
`;

const SecondaryButton = styled.button`
  background: white;
  color: #06C755;
  border: 2px solid #06C755;
  padding: 14px 30px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 160px;
  width: 200px;

  &:hover {
    background: #06C755;
    color: white;
    transform: translateY(-2px);
  }
`;

// Support Section - Combined Networks and Protocols
const SupportSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 24px;
  flex-wrap: wrap;
`;

const SupportGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SupportLabel = styled.span`
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
`;

const SupportIcon = styled.div`
  position: relative;
  display: inline-block;
  cursor: pointer;
  margin-top: 4px;
`;

const IconImage = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: transform 0.2s ease;

  ${SupportIcon}:hover & {
    transform: scale(1.1);
  }
`;

const Tooltip = styled.div<{ $visible?: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  visibility: ${({ $visible }) => $visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  margin-bottom: 8px;
  z-index: 10;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1e293b;
  }
`;

const RequestButton = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f5f9;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e2e8f0;
    transform: scale(1.1);
  }
`;

const PlusIcon = styled(Plus)`
  width: 14px;
  height: 14px;
  color: #64748b;
`;

// Phone components must be defined before MobileMockup to avoid hoisting issues
const PhoneFrame = styled.div`
  width: 320px;
  height: 640px;
  background: #1e293b;
  border-radius: 40px;
  padding: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  transition: box-shadow 0.3s ease;
`;

const PhoneScreen = styled.div`
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 28px;
  overflow: hidden;
  position: relative;
`;

const LINEHeader = styled.div`
  background: #00B900;
  color: white;
  padding: 16px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
`;

const ChatInterface = styled.div`
  padding: 16px;
  height: calc(100% - 48px);
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AIResponse = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
`;

const AIIcon = styled.div<{ $delay?: number }>`
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #06C755 0%, #059669 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: ${({ $delay }) => $delay}s;

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Animated Chat Components
const AnimatedChatBubble = styled.div<{ $isUser?: boolean; $delay?: number }>`
  background: ${({ $isUser }) => $isUser ? '#06C755' : 'white'};
  color: ${({ $isUser }) => $isUser ? 'white' : '#1e293b'};
  padding: 12px 16px;
  border-radius: 18px;
  max-width: 80%;
  font-size: 14px;
  align-self: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: ${({ $delay }) => $delay}s;

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const LoadingDots = styled.div<{ $delay?: number; $duration?: number }>`
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards, fadeOut 0.6s ease-out forwards;
  animation-delay: ${({ $delay }) => $delay}s, ${({ $duration, $delay }) => ($delay || 0) + ($duration || 2)}s;

  &::after {
    content: '';
    display: inline-block;
    width: 4px;
    height: 4px;
    background: #06C755;
    border-radius: 50%;
    animation: loading 1.4s infinite ease-in-out both;
  }

  &::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 4px;
    background: #06C755;
    border-radius: 50%;
    animation: loading 1.4s infinite ease-in-out both;
    animation-delay: -0.32s;
  }

  span {
    display: inline-block;
    width: 4px;
    height: 4px;
    background: #06C755;
    border-radius: 50%;
    animation: loading 1.4s infinite ease-in-out both;
    animation-delay: -0.16s;
  }

  @keyframes loading {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
`;

// Mobile Mockup Styles - defined after PhoneFrame to avoid hoisting issues
const MobileMockup = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    
    ${PhoneFrame} {
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
    }
  }
`;

interface HeroSectionProps {
  onGetStarted: () => void;
  onTryDesktop: () => void;
  onAIAgent?: () => void;
}

export const HeroSection = ({ onGetStarted, onTryDesktop, onAIAgent }: HeroSectionProps) => {
  const router = useRouter();
  const { selectedChain } = useChain();
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdSdDIX5OCCHnc2LbKF4j7rfzQEJmsIEhusTK5r6P_XCgYRLw/viewform?usp=dialog';

  const openGoogleForm = () => {
    window.open(GOOGLE_FORM_URL, '_blank');
  };


  return (
    <HeroSectionWrapper>
      <HeroContainer>
        <HeroContent>
          <HeroTitle>
            Agent-Native DeFi Infrastructure
          </HeroTitle>
          <HeroSubtitle>
           Powering AI agents with capital to lend, borrow, trade, and execute strategies autonomously on-chain.
          </HeroSubtitle>

          <CTAContainer>
            <PrimaryButton onClick={() => router.push('/markets')}>
              Access Platform
            </PrimaryButton>
            <SecondaryButton onClick={() => window.open('https://discord.gg/BDQnjcHbnj', '_blank', 'noopener,noreferrer')}>
              Meet AI Agents
            </SecondaryButton>
          </CTAContainer>

          {/* Support Section - Combined Networks and Protocols */}
          <SupportSection>
            <SupportGroup>
              <SupportLabel>Supported Networks:</SupportLabel>
              <SupportIcon
                onMouseEnter={() => setTooltipVisible('kaia')}
                onMouseLeave={() => setTooltipVisible(null)}
              >
                <IconImage
                  src="/images/blockchain-icons/kaia-token-icon.png"
                  alt="KAIA"
                />
                <Tooltip $visible={tooltipVisible === 'kaia'}>
                  KAIA
                </Tooltip>
              </SupportIcon>
              <SupportIcon
                onMouseEnter={() => setTooltipVisible('kub')}
                onMouseLeave={() => setTooltipVisible(null)}
              >
                <IconImage
                  src="/images/blockchain-icons/kub-chain-icon.png"
                  alt="KUB"
                />
                <Tooltip $visible={tooltipVisible === 'kub'}>
                  KUB Chain
                </Tooltip>
              </SupportIcon>
              <SupportIcon
                onMouseEnter={() => setTooltipVisible('etherlink')}
                onMouseLeave={() => setTooltipVisible(null)}
              >
                <IconImage
                  src="/images/blockchain-icons/etherlink-icon.png"
                  alt="Etherlink"
                />
                <Tooltip $visible={tooltipVisible === 'etherlink'}>
                  Etherlink
                </Tooltip>
              </SupportIcon>
              <RequestButton
                onClick={openGoogleForm}
                onMouseEnter={() => setTooltipVisible('request-blockchain')}
                onMouseLeave={() => setTooltipVisible(null)}
              >
                <PlusIcon />
                <Tooltip $visible={tooltipVisible === 'request-blockchain'}>
                  Request new network
                </Tooltip>
              </RequestButton>
            </SupportGroup>
            
           {/* <SupportGroup>
              <SupportLabel>Supported Protocols:</SupportLabel>
              <SupportIcon
                onMouseEnter={() => setTooltipVisible('kilolend')}
                onMouseLeave={() => setTooltipVisible(null)}
              >
                <IconImage
                  src="/images/kilolend-brand.png"
                  alt="KiloLend"
                />
                <Tooltip $visible={tooltipVisible === 'kilolend'}>
                  KiloLend
                </Tooltip>
              </SupportIcon>
              <RequestButton
                onClick={openGoogleForm}
                onMouseEnter={() => setTooltipVisible('request-protocol')}
                onMouseLeave={() => setTooltipVisible(null)}
              >
                <PlusIcon />
                <Tooltip $visible={tooltipVisible === 'request-protocol'}>
                  Request new protocol
                </Tooltip>
              </RequestButton>
            </SupportGroup>*/}
          </SupportSection>

        </HeroContent>

        <MobileMockup onClick={onGetStarted}>
          <PhoneFrame>
            <PhoneScreen>
              <LINEHeader>KiloLend on LINE</LINEHeader>
              <ChatInterface>
                {/* Welcome Message */}
                <AIResponse>
                  <AIIcon $delay={0}>🐍</AIIcon>
                  <AnimatedChatBubble $isUser={false} $delay={0}>
                    🐍 Welcome! I'm Sly, your DeFi Co-Pilot. Ready to earn some yield? 🚀
                  </AnimatedChatBubble>
                </AIResponse>

                {/* Sly's Initial Greeting */}
                <AIResponse>
                  <AIIcon $delay={2}>🐍</AIIcon>
                  <AnimatedChatBubble $isUser={false} $delay={2}>
                    🐍 Let's strike! Supply USDT to earn 6.1% APY! 🎯
                  </AnimatedChatBubble>
                </AIResponse>

                {/* User Action */}
                <AnimatedChatBubble $isUser={true} $delay={4}>
                  ok, help supply 100 USDT
                </AnimatedChatBubble>

                {/* Loading Animation */}
                <LoadingDots $delay={5} $duration={1}>
                  <span></span>
                </LoadingDots>

                {/* Transaction Success */}
                <AIResponse>
                  <AIIcon $delay={6}>🐍</AIIcon>
                  <AnimatedChatBubble $isUser={false} $delay={6}>
                    🐍 Perfect strike! You're earning $6.10 per year! 💰
                  </AnimatedChatBubble>
                </AIResponse>

                {/* User Question */}
                <AnimatedChatBubble $isUser={true} $delay={8}>
                  how much KAIA can I borrow?
                </AnimatedChatBubble>

                {/* Loading Animation */}
                <LoadingDots $delay={9} $duration={1}>
                  <span></span>
                </LoadingDots>

                {/* Borrowing Response */}
                <AIResponse>
                  <AIIcon $delay={10}>🐍</AIIcon>
                  <AnimatedChatBubble $isUser={false} $delay={10}>
                    🐍 You can borrow 50 KAIA! Your health factor is strong at 2.0 🛡️
                  </AnimatedChatBubble>
                </AIResponse>
              </ChatInterface>
            </PhoneScreen>
          </PhoneFrame>
        </MobileMockup>
      </HeroContainer>
    </HeroSectionWrapper>
  );
};