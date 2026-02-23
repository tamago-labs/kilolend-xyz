"use client";

import styled from 'styled-components';

// Demo Video Section Styles
const DemoVideoWrapper = styled.section`
  background: linear-gradient(135deg, #06C755 0%, #059669 100%);
  padding: 80px 32px;
  margin: 0 -32px;
  position: relative;
  overflow: hidden;
`;

const DemoVideoContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin-bottom: 16px;
  text-align: center;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 28px;
    margin-bottom: 12px;
  }
`;

const SectionSubtitle = styled.p`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 48px;
  text-align: center;
  line-height: 1.6;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    font-size: 16px;
    margin-bottom: 32px;
  }
`;

const VideoContainer = styled.div`
  max-width: 300px;
  margin: 0 auto 48px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;

  @media (max-width: 768px) {
    max-width: 90%;
    margin-bottom: 32px;
  }
`;

const DemoVideo = styled.video`
  width: 100%;
  height: auto;
  display: block;
  border-radius: 16px;
`;

const FeaturesContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  max-width: 900px;
  margin: 0 auto;
 
`;

const FeaturePill = styled.div`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 10px 16px;
  }
`;

const CheckIcon = styled.span`
  font-size: 18px;
  color: #bbf7d0;
`;

export const DemoVideoSection = () => {
  return (
    <DemoVideoWrapper>
      <DemoVideoContainer>
        <SectionTitle>DeFi from WhatsApp</SectionTitle>
        <SectionSubtitle>
          See how AI agents handle lending, borrowing, and swaps directly in WhatsApp via OpenClaw, with support for Telegram, Discord, and more
        </SectionSubtitle>
  
        <VideoContainer>
          <DemoVideo
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            poster="/images/poster-agent-v1.png"
          >
            <source src="/videos/kilolend-demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </DemoVideo>
        </VideoContainer>
 
      </DemoVideoContainer>
    </DemoVideoWrapper>
  );
};