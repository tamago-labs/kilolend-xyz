import styled from 'styled-components';

const ErrorContainer = styled.div`
  margin-top: 16px;
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ErrorIcon = styled.div`
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
`;

const ErrorText = styled.div`
  flex: 1;
`;

const WalletConnectPrompt = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const WalletIcon = styled.div`
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
`;

const ChainSwitchPrompt = styled.div`
  background: #fefce8;
  border: 1px solid #fde047;
  color: #a16207;
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const ChainIcon = styled.div`
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
`;

interface DesktopSwapErrorMessageProps {
  error: string;
  isConnected: boolean;
  isSupportedChain: boolean;
}

export const DesktopSwapErrorMessage = ({
  error,
  isConnected,
  isSupportedChain
}: DesktopSwapErrorMessageProps) => {

  if (!isConnected) {
    return (
      <ErrorContainer>
        <WalletConnectPrompt>
          <WalletIcon>🔐</WalletIcon>
          <ErrorText>
            Please connect your wallet to start swapping tokens on KUB Chain.
          </ErrorText>
        </WalletConnectPrompt>
      </ErrorContainer>
    );
  }

  if (!isSupportedChain) {
    return (
      <ErrorContainer>
        <ChainSwitchPrompt>
          <ChainIcon>⛓️</ChainIcon>
          <ErrorText>
            Please switch to KUB Chain network to use the DEX. Click the network selector in your wallet to change networks.
          </ErrorText>
        </ChainSwitchPrompt>
      </ErrorContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <ErrorMessage>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorText>{error}</ErrorText>
        </ErrorMessage>
      </ErrorContainer>
    );
  }

  return null;
};