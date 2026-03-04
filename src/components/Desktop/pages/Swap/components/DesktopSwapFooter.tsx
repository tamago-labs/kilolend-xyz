"use client";

import styled from 'styled-components';

const FooterContainer = styled.div`
  text-align: center;
  margin-top: 48px;
  padding: 32px;
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
      <SupportNote>
        More tokens and chains coming soon. Follow our social channels for updates.
      </SupportNote>
    </FooterContainer>
  );
};
