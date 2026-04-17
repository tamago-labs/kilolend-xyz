'use client';

import styled from 'styled-components';
import { BaseModal } from './BaseModal';

const ModalContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
`;

const IconContainer = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #fef3c7, #fed7aa);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  font-size: 28px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
  line-height: 1.3;
`;

const Message = styled.p`
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 320px;
`;

const CloseButton = styled.button`
  padding: 12px 32px;
  background: linear-gradient(135deg, #06C755, #05b648);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  max-width: 200px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(6, 199, 85, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

interface LineMiniDAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LineMiniDAppModal = ({ isOpen, onClose }: LineMiniDAppModalProps) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Update on LINE Mini DApp">
      <ModalContainer>
        <IconContainer>
          📱
        </IconContainer>
        <Title>We're Phasing Out LINE Mini DApp</Title>
        <Message>
          We're phasing out the LINE Mini DApp. You can continue using all features on the desktop version.
        </Message>
        <CloseButton onClick={onClose}>
          Got it
        </CloseButton>
      </ModalContainer>
    </BaseModal>
  );
};