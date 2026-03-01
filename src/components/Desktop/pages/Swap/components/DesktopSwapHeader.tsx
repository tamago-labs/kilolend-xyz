import styled from 'styled-components';

const HeaderContainer = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.1;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
`;

const ChainBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 6px 16px;
  margin-top: 16px;
`;

const ChainIcon = styled.span`
  font-size: 16px;
`;

const ChainText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
`;

export const DesktopSwapHeader = () => {
  return (
    <HeaderContainer>
      <Title>KiloLend DEX</Title>
      <Subtitle>Swap AI-agent tokens on KUB Chain</Subtitle>
      <ChainBadge>
        <ChainIcon>🔗</ChainIcon>
        <ChainText>KUB Chain Network</ChainText>
      </ChainBadge>
    </HeaderContainer>
  );
};