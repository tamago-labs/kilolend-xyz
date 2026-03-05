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
}

export function AgentGridComponent({ agents, onAgentClick }: AgentGridProps) {
  return (
    <AgentGrid>
      {agents.map(agent => (
        <AgentCardComponent
          key={agent.id}
          agent={agent}
          onClick={() => onAgentClick(agent)}
        />
      ))}
    </AgentGrid>
  );
}