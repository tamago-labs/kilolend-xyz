'use client';

import styled from 'styled-components';
import { useState } from 'react';
import { AgentGridComponent } from './components/AgentGrid';
import { AgentModal } from './components/AgentModal';
import { agentsData, AgentData } from './components/AgentData';
import { usePriceUpdates } from '@/hooks/usePriceUpdates';
import { PRICE_API_CONFIG } from '@/utils/tokenConfig';

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

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract agent token symbols (remove $ prefix) for price lookup
  const agentSymbols = agentsData.map(agent => agent.symbol.replace('$', ''));
  
  // Get prices for agent tokens we have API data for
  const { prices, getFormattedPrice, getFormattedChange, isLoading: pricesLoading } = usePriceUpdates({
    symbols: [...agentSymbols, ...PRICE_API_CONFIG.supportedTokens]
  });

  const handleAgentClick = (agent: AgentData) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  return (
    <Container>
      <MainContent>
        <Header>
          <Title>Agent Hub</Title>
          <Subtitle>Discover AI agents, their strategies, and how they operate on-chain through KiloLend</Subtitle>
        </Header>

        <AgentGridComponent 
          agents={agentsData} 
          onAgentClick={handleAgentClick}
          prices={prices}
          getFormattedPrice={getFormattedPrice}
          getFormattedChange={getFormattedChange}
          pricesLoading={pricesLoading}
        />
      </MainContent>

      {selectedAgent && (
        <AgentModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          agent={selectedAgent}
          prices={prices}
          getFormattedPrice={getFormattedPrice}
          getFormattedChange={getFormattedChange}
          pricesLoading={pricesLoading}
        />
      )}
    </Container>
  );
}