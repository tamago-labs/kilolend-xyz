import styled from 'styled-components';
import { DesktopBaseModal } from '@/components/Desktop/modals/shared/DesktopBaseModal';
import { AgentData } from './AgentData';

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const ModalIcon = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 12px;
`;

const ModalTitle = styled.div`
  flex: 1;
`;

const ModalName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
`;

const ModalSubtitle = styled.div<{ theme: 'green' | 'blue' | 'purple' }>`
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${props => {
    switch (props.theme) {
      case 'green': return '#06C755';
      case 'blue': return '#3b82f6';
      case 'purple': return '#8b5cf6';
      default: return '#06C755';
    }
  }};
`;

const ModalDescription = styled.div`
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
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

const StatusBadge = styled.span<{ theme: 'green' | 'blue' | 'purple' }>`
  display: inline-block;
  padding: 4px 12px;
  background: ${props => {
    switch (props.theme) {
      case 'green': return '#06C755';
      case 'blue': return '#3b82f6';
      case 'purple': return '#8b5cf6';
      default: return '#06C755';
    }
  }};
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

const ActionButton = styled.a<{ primary?: boolean; theme: 'green' | 'blue' | 'purple'; disabled?: boolean }>`
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  border: 2px solid ${props => props.disabled ? '#e2e8f0' : 
    (props.primary ? 
    (props.theme === 'green' ? '#06C755' : props.theme === 'blue' ? '#3b82f6' : '#8b5cf6') : 
    'transparent')};
  background: ${props => props.disabled ? '#f1f5f9' : 
    (props.primary ? 
    (props.theme === 'green' ? '#06C755' : props.theme === 'blue' ? '#3b82f6' : '#8b5cf6') : 
    'transparent')};
  color: ${props => props.disabled ? '#94a3b8' : 
    (props.primary ? 'white' : 
    (props.theme === 'green' ? '#06C755' : props.theme === 'blue' ? '#3b82f6' : '#8b5cf6'))};
  
  ${props => !props.disabled && `
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px ${props.theme === 'green' ? 'rgba(6, 199, 85, 0.2)' : 
        props.theme === 'blue' ? 'rgba(59, 130, 246, 0.2)' : 
        'rgba(139, 92, 246, 0.2)'};
    }
  `}
`;

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentData;
  prices?: Record<string, any>;
  getFormattedPrice?: (symbol: string) => string;
  getFormattedChange?: (symbol: string) => { text: string; isPositive: boolean };
  pricesLoading?: boolean;
}

export function AgentModal({ 
  isOpen, 
  onClose, 
  agent, 
  prices, 
  getFormattedPrice, 
  getFormattedChange, 
  pricesLoading 
}: AgentModalProps) {
  const isComingSoon = agent.id === 'mantis' || agent.id === 'babyclaw';

  // Get the token symbol without $ prefix for price lookup
  const tokenSymbol = agent.symbol.replace('$', '');
  
  // Check if we have real price data for this token
  const hasRealPrice = prices && prices[tokenSymbol];
  
  // Use real price if available, otherwise fallback to mock data or show loading
  const displayPrice = hasRealPrice && getFormattedPrice 
    ? getFormattedPrice(tokenSymbol) 
    : pricesLoading 
      ? 'Loading...' 
      : 'N/A';
  
  const displayChange = hasRealPrice && getFormattedChange
    ? getFormattedChange(tokenSymbol)
    : { text: 'N/A', isPositive: true };

  // Get market data if available
  const marketData = hasRealPrice && prices[tokenSymbol] ? {
    marketCap: prices[tokenSymbol].market_cap,
    volume24h: prices[tokenSymbol].volume_24h
  } : null;

  return (
    <DesktopBaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={agent.name}
      width="800px"
    >
      <ModalHeader>
        <ModalIcon src={agent.icon} alt={agent.name} />
        <ModalTitle>
          <ModalName>{agent.name}</ModalName>
          <ModalSubtitle theme={agent.theme}>{agent.subtitle}</ModalSubtitle>
        </ModalTitle>
      </ModalHeader>
      <ModalDescription>
        {agent.description}
      </ModalDescription>

      <Section>
        <SectionTitle>Available Chains</SectionTitle>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {agent.chains.map(chain => (
            <div key={chain.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src={chain.icon} 
                alt={chain.name}
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '6px' 
                }}
              />
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 500,
                color: '#1e293b',
                textTransform: 'uppercase'
              }}>
                {chain.name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* <Section>
        <SectionTitle>Performance Metrics</SectionTitle>
        <MetricsGrid>
          <MetricCard>
            <MetricLabel>Current Price</MetricLabel>
            <MetricValue>{displayPrice}</MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>24h Change</MetricLabel>
            <MetricValue style={{ color: displayChange.isPositive ? '#06C755' : '#ef4444' }}>
              {displayChange.text}
            </MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>Market Cap</MetricLabel>
            <MetricValue>
              {marketData && marketData.marketCap > 0 
                ? `$${(marketData.marketCap / 1000000).toFixed(2)}M` 
                : 'N/A'}
            </MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>Volume 24h</MetricLabel>
            <MetricValue>
              {marketData && marketData.volume24h > 0 
                ? `$${(marketData.volume24h / 1000000).toFixed(2)}M` 
                : 'N/A'}
            </MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>Total Supply</MetricLabel>
            <MetricValue>{(agent.totalSupply / 1000000000).toFixed(0)}B {agent.symbol}</MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>Total Burned</MetricLabel>
            <MetricValue>{(agent.totalBurned / 1000000000).toFixed(0)}B {agent.symbol}</MetricValue>
          </MetricCard>
        </MetricsGrid>
      </Section> */}

      <Section>
        <SectionTitle>Recent Activity</SectionTitle>
        <ActivityList>
          {agent.activities.map((activity, index) => (
            <ActivityItem key={index}>
              <ActivityText>{activity.text}</ActivityText>
              <ActivityTime>{activity.time}</ActivityTime>
            </ActivityItem>
          ))}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>Status:</span>
            <StatusBadge theme={agent.theme}>{agent.statusBadge}</StatusBadge>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '12px' }}>
              Last action: {agent.lastAction}
            </span>
          </div>
        </ActivityList>
      </Section>

      <Section>
        <SectionTitle>Why {agent.symbol}?</SectionTitle>
        <BenefitsList>
          {agent.benefits.map((benefit, index) => (
            <BenefitItem key={index}>{benefit}</BenefitItem>
          ))}
        </BenefitsList>
      </Section>

      <Section>
        <ActionButtons>
          {isComingSoon ? (
            <ActionButton 
              href="#" 
              primary 
              theme={agent.theme}
              disabled
              onClick={(e) => e.preventDefault()}
            >
              Coming Soon
            </ActionButton>
          ) : (
            <>
              <ActionButton href="https://klawster.xyz" primary theme={agent.theme}>Learn More</ActionButton>
              <ActionButton href="/swap" target="_blank" theme={agent.theme}>Buy {agent.symbol}</ActionButton>
            </>
          )}
        </ActionButtons>
      </Section>
    </DesktopBaseModal>
  );
}