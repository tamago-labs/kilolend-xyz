"use client";

import styled from 'styled-components';
import { ExternalLink } from 'react-feather';

const KYCWarningContainer = styled.div`
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const WarningIcon = styled.div`
  color: #d97706;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
`;

const WarningContent = styled.div`
  flex: 1;
`;

const WarningTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
  line-height: 1.4;
`;

const KYCLinkContainer = styled.div`
  margin-top: 12px;
`;

const KYCLinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;

  &:hover {
    background: #d97706;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const DesktopKYCWarning = () => {
  const handleKYCLinkClick = () => {
    window.open('https://kkub-otp.bitkubchain.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <KYCWarningContainer>
      <WarningIcon>⚠️</WarningIcon>
      <WarningContent>
        <WarningTitle>
          Please complete KYC verification for your address using the link below before unwrapping:
        </WarningTitle>
        <KYCLinkContainer>
          <KYCLinkButton onClick={handleKYCLinkClick}>
            <ExternalLink size={16} />
            Complete KYC Verification
          </KYCLinkButton>
        </KYCLinkContainer>
      </WarningContent>
    </KYCWarningContainer>
  );
};

export default DesktopKYCWarning;