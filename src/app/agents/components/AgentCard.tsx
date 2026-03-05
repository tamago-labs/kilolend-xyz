import styled from 'styled-components';
import { AgentData } from './AgentData';

const AgentCard = styled.div<{ theme: 'green' | 'blue' | 'purple' }>`
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
    border-color: ${props => {
      switch (props.theme) {
        case 'green': return '#06C755';
        case 'blue': return '#3b82f6';
        case 'purple': return '#8b5cf6';
        default: return '#06C755';
      }
    }};
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

const PriceChange = styled.div<{ positive: boolean; theme: 'green' | 'blue' | 'purple' }>`
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

interface AgentCardProps {
  agent: AgentData;
  onClick: () => void;
}

export function AgentCardComponent({ agent, onClick }: AgentCardProps) {
  return (
    <AgentCard theme={agent.theme} onClick={onClick}>
      <AgentIcon src={agent.icon} alt={agent.name} />
      <AgentName>{agent.name}</AgentName>
      <TokenInfo>{agent.symbol} • ${agent.price.toFixed(7)}</TokenInfo>
      <PriceChange positive={agent.priceChange24h > 0} theme={agent.theme}>
        {agent.priceChange24h > 0 ? '+' : ''}{agent.priceChange24h}% (24h)
      </PriceChange>
      {/*<ChainSection>
        <ChainLabel>Available on:</ChainLabel>
        <ChainIcons>
          {agent.chains.map(chain => (
            <ChainIcon key={chain.name} src={chain.icon} alt={chain.name} />
          ))}
        </ChainIcons>
      </ChainSection>*/}
      <LastAction>Last Action: {agent.lastAction}</LastAction>
    </AgentCard>
  );
}