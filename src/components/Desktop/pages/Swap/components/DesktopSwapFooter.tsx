"use client";

import styled from 'styled-components';

const FooterContainer = styled.div`
  text-align: center;
  margin-top: 48px;
  padding: 32px;
`;

const EarlyStageMessage = styled.div`
  font-size: 14px;
  color: #06C755;
  font-weight: 500;
  margin-bottom: 16px;
  padding: 12px 24px;
  background: rgba(6, 199, 85, 0.1);
  border-radius: 8px;
  display: inline-block;
  border: 1px solid rgba(6, 199, 85, 0.2);
`;

const ChainBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 6px 16px;
`;

const ChainIcon = styled.span`
  font-size: 16px;
`;

const ChainText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
`;

const SupportNote = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 12px;
  font-style: italic;
`;

interface DesktopSwapFooterProps {
  className?: string;
}

export const DesktopSwapFooter = ({ className }: DesktopSwapFooterProps) => {
  return (
    <FooterContainer className={className}>
      <EarlyStageMessage>
        KiloLend DEX is in an early stage, currently available on limited chains and supporting select trading pairs.
      </EarlyStageMessage>
        
      <SupportNote>
        More tokens and chains coming soon. Follow our social channels for updates.
      </SupportNote>
    </FooterContainer>
  );
};