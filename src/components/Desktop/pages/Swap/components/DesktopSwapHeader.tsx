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
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.5;
`;


export const DesktopSwapHeader = () => {
  return (
    <HeaderContainer>
      <Title>Swap</Title>
      <Subtitle>Seamlessly swap into DeFi AI-agent tokens within the ecosystem</Subtitle>
    </HeaderContainer>
  );
};
