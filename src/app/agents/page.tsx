'use client';

import styled from 'styled-components';
import { useState } from 'react';
import { DesktopBaseModal } from '@/components/Desktop/modals/shared/DesktopBaseModal';

const Container = styled.div`
  min-height: 100vh;
  background: #f8fafc;
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #64748b;
`;

const AgentGrid = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 24px;
  flex-wrap: wrap;
`;

const AgentCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 320px;
  text-align: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-color: #06C755;
  }
`;

const AgentIcon = styled.img`
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  border-radius: 12px;
`;

const AgentName = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 6px 0;
`;

const TokenInfo = styled.div`
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
`;

const PriceChange = styled.div<{ positive: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.positive ? '#06C755' : '#ef4444'};
  margin-bottom: 16px;
`;

const ChainSection = styled.div`
  margin-bottom: 12px;
`;

const ChainLabel = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
`;

const ChainIcons = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
`;

const ChainIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 6px;
`;

const LastAction = styled.div`
  font-size: 12px;
  color: #94a3b8;
`;

const ModalBody = styled.div`
  padding: 32px;
`;

const Section = styled.div`
  margin-bottom: 32px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const MetricCard = styled.div`
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
`;

const ActivityList = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
`;

const ActivityItem = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  &:first-child {
    padding-top: 0;
  }
`;

const ActivityText = styled.div`
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 4px;
`;

const ActivityTime = styled.div`
  font-size: 12px;
  color: #94a3b8;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: #06C755;
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  margin-left: 8px;
`;

const BenefitsList = styled.div`
  display: grid;
  gap: 12px;
`;

const BenefitItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #1e293b;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ActionButton = styled.a<{ primary?: boolean }>`
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid ${props => props.primary ? '#06C755' : 'transparent'};
  background: ${props => props.primary ? '#06C755' : 'transparent'};
  color: ${props => props.primary ? 'white' : '#06C755'};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(6, 199, 85, 0.2);
  }
`;

const RiskWarning = styled.div`
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 16px;
  margin-top: 24px;
`;

const RiskTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
`;

const RiskText = styled.div`
  font-size: 12px;
  color: #78350f;
  line-height: 1.5;
`;

export default function AgentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const klawsterData = {
    name: 'Klawster',
    symbol: '$KLAW',
    price: 0.0000135,
    priceChange24h: 5.2,
    icon: '/images/token-icons/klaw-icon.png',
    chains: [
      { name: 'kaia', icon: '/images/blockchain-icons/kaia-token-icon.png' },
      { name: 'kub', icon: '/images/blockchain-icons/kub-chain-icon.png' }
    ],
    lastAction: '2 minutes ago',
    marketCap: 1250000,
    totalSupply: 1000000000,
    circulatingSupply: 85000000000,
    treasuryValue: 50000,
    totalBurned: 2500000000
  };

  const recentActivity = [
    { text: 'Executed profitable trade: +2.3% ETH position', time: '15 minutes ago' },
    { text: 'Auto buyback & burn: 2,500 $KLAW removed', time: '2 minutes ago' },
    { text: 'New strategy activated: Momentum trading', time: 'Just now' },
    { text: 'Borrowed capital: 500 KUB for new position', time: '5 minutes ago' }
  ];

  return (
    <Container>
      <MainContent>
        <Header>
          <Title>Agent Hub</Title>
          <Subtitle>Discover AI agents, their strategies, and how they operate on-chain through KiloLend</Subtitle>
        </Header>

        <AgentGrid>
          <AgentCard onClick={() => setIsModalOpen(true)}>
            <AgentIcon src={klawsterData.icon} alt="Klawster" />
            <AgentName>{klawsterData.name}</AgentName>
            <TokenInfo>{klawsterData.symbol} • ${klawsterData.price.toFixed(7)}</TokenInfo>
            <PriceChange positive={klawsterData.priceChange24h > 0}>
              {klawsterData.priceChange24h > 0 ? '+' : ''}{klawsterData.priceChange24h}% (24h)
            </PriceChange>
            <ChainSection>
              <ChainLabel>Available on:</ChainLabel>
              <ChainIcons>
                {klawsterData.chains.map(chain => (
                  <ChainIcon key={chain.name} src={chain.icon} alt={chain.name} />
                ))}
              </ChainIcons>
            </ChainSection>
            <LastAction>Last Action: {klawsterData.lastAction}</LastAction>
          </AgentCard>
        </AgentGrid>
      </MainContent>

          <DesktopBaseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={klawsterData.name}
        width="800px"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <img 
            src={klawsterData.icon} 
            alt={klawsterData.name}
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px' 
            }}
          />
          <div>
            <div style={{ 
              fontSize: '14px', 
              color: '#06C755', 
              fontWeight: 600, 
              textTransform: 'uppercase',
              letterSpacing: '0.5px' 
            }}>
              OpenClaw-Powered Agent Token
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#64748b', 
              lineHeight: '1.5',
              marginTop: '4px'
            }}>
              An autonomous AI that trades DeFi on-chain. When AI agent generates profit, it automatically buys back and burns $KLAW tokens.
            </div>
          </div>
        </div>

        <Section>
          <SectionTitle>Performance Metrics</SectionTitle>
          <MetricsGrid>
            <MetricCard>
              <MetricLabel>Current Price</MetricLabel>
              <MetricValue>${klawsterData.price.toFixed(7)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>24h Change</MetricLabel>
              <MetricValue style={{ color: klawsterData.priceChange24h > 0 ? '#06C755' : '#ef4444' }}>
                {klawsterData.priceChange24h > 0 ? '+' : ''}{klawsterData.priceChange24h}%
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Market Cap</MetricLabel>
              <MetricValue>
                {/*${(klawsterData.marketCap).toLocaleString()}*/}
                N/A
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Treasury Value</MetricLabel>
              <MetricValue>
                {/*${(klawsterData.treasuryValue).toLocaleString()}*/}
                N/A
            </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Total Supply</MetricLabel>
              <MetricValue>
                {(klawsterData.totalSupply / 1000000000).toFixed(0)}B $KLAW
             </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Total Burned</MetricLabel>
              <MetricValue>
                {/*{(klawsterData.totalBurned / 1000000000).toFixed(2)}B $KLAW*/}
                N/A
              </MetricValue>
            </MetricCard>
          </MetricsGrid>
        </Section>

      {/*  <Section>
          <SectionTitle>Recent Activity</SectionTitle>
          <ActivityList>
            {recentActivity.map((activity, index) => (
              <ActivityItem key={index}>
                <ActivityText>{activity.text}</ActivityText>
                <ActivityTime>{activity.time}</ActivityTime>
              </ActivityItem>
            ))}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>Status:</span>
              <StatusBadge>Active</StatusBadge>
              <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '12px' }}>
                Last action: {klawsterData.lastAction}
              </span>
            </div>
          </ActivityList>
        </Section>*/}

        <Section>
          <SectionTitle>Why $KLAW?</SectionTitle>
          <BenefitsList>
            <BenefitItem>Auto Buybacks: Profits automatically buy and burn tokens</BenefitItem>
            <BenefitItem>Growing Treasury: Agent success increases token value</BenefitItem>
            <BenefitItem>AI-Powered: Autonomous trading across multiple chains</BenefitItem>
            {/*<BenefitItem>Multi-Chain: Operates on KAIA and KUB for more opportunities</BenefitItem>*/}
            <BenefitItem>Transparent: Every action verifiable on-chain</BenefitItem>
          </BenefitsList>
        </Section>

        {/*<Section>
          <SectionTitle>Token Dynamics</SectionTitle>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '16px' }}>
              <strong>How it works:</strong>
            </div>
            <div style={{ marginBottom: '8px' }}>1. Agent trades with treasury capital</div>
            <div style={{ marginBottom: '8px' }}>2. Profits generated from successful trades</div>
            <div style={{ marginBottom: '8px' }}>3. Auto buybacks reduce supply</div>
            <div style={{ marginBottom: '16px' }}>4. Reduced supply + demand = potential price appreciation</div>
            <div style={{ fontSize: '12px', color: '#06C755', fontWeight: 600 }}>
              Current Burn Rate: ~10,000 $KLAW/day
            </div>
          </div>
        </Section>*/}

        <Section>
          {/*<SectionTitle>Get Started</SectionTitle>*/}
          <ActionButtons>
            <ActionButton href="https://klawster.xyz" primary>Learn More</ActionButton>
            <ActionButton href="/swap" target="_blank">Buy $KLAW</ActionButton>
            {/*<ActionButton href="#" target="_blank">View Chart</ActionButton>
            <ActionButton href="https://klawster.xyz" target="_blank">Learn More</ActionButton>
            <ActionButton href="#" target="_blank">Join Community</ActionButton>*/}
          </ActionButtons>

         {/* <RiskWarning>
            <RiskTitle>Risk Factors</RiskTitle>
            <RiskText>
              • Experimental AI technology<br/>
              • Market volatility risk<br/>
              • Smart contract risk<br/>
              • Past performance doesn't guarantee future results<br/><br/>
              Always do your own research before investing.
            </RiskText>
          </RiskWarning>*/}
        </Section>
      </DesktopBaseModal>

    </Container>
  );
}
