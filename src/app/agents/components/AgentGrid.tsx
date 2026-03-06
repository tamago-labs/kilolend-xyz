import styled from 'styled-components';
import { AgentCardComponent } from './AgentCard';
import { AgentData } from './AgentData';

const AgentGrid = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 24px;
  flex-wrap: wrap;
`;

interface AgentGridProps {
  agents: AgentData[];
  onAgentClick: (agent: AgentData) => void;
  prices?: Record<string, any>;
  getFormattedPrice?: (symbol: string) => string;
  getFormattedChange?: (symbol: string) => { text: string; isPositive: boolean };
  pricesLoading?: boolean;
}

export function AgentGridComponent({ 
  agents, 
  onAgentClick, 
  prices, 
  getFormattedPrice, 
  getFormattedChange, 
  pricesLoading 
}: AgentGridProps) {
  return (
    <AgentGrid>
      {agents.map(agent => (
        <AgentCardComponent
          key={agent.id}
          agent={agent}
          onClick={() => onAgentClick(agent)}
          prices={prices}
          getFormattedPrice={getFormattedPrice}
          getFormattedChange={getFormattedChange}
          pricesLoading={pricesLoading}
        />
      ))}
    </AgentGrid>
  );
}
