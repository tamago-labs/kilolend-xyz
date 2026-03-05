'use client';

import styled from 'styled-components';
import { useState } from 'react';
import { AgentGridComponent } from './components/AgentGrid';
import { AgentModal } from './components/AgentModal';
import { agentsData, AgentData } from './components/AgentData';

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
        />
      </MainContent>

      {selectedAgent && (
        <AgentModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          agent={selectedAgent}
        />
      )}
    </Container>
  );
}