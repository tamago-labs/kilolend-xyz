import styled from 'styled-components';

const SwapButton = styled.button<{ disabled?: boolean }>`
  width: 100%;
  padding: 18px;
  background: ${props => {
    if (props.disabled) return '#e5e7eb';
    return 'linear-gradient(135deg, #06C755 0%, #05a048 100%)';
  }};
  color: ${props => props.disabled ? '#9ca3af' : 'white'};
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(6, 199, 85, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface DesktopSwapButtonProps {
  amount: string;
  quote: any;
  isLoading: boolean;
  isConnected: boolean;
  isSupportedChain: boolean;
  onSwap: () => void;
}

export const DesktopSwapButton = ({
  amount,
  quote,
  isLoading,
  isConnected,
  isSupportedChain,
  onSwap
}: DesktopSwapButtonProps) => {

  const getButtonText = () => {
    if (isLoading) {
      return 'Processing...';
    }
    
    if (!isConnected) {
      return 'Connect Wallet';
    }
    
    if (!isSupportedChain) {
      return 'Switch to KUB Chain';
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return 'Enter Amount';
    }
    
    if (!quote) {
      return 'Fetching Quote...';
    }
    
    return 'Swap';
  };

  const isDisabled = !isConnected || 
                     !isSupportedChain || 
                     !amount || 
                     parseFloat(amount) <= 0 || 
                     !quote || 
                     isLoading;

  return (
    <SwapButton
      onClick={onSwap}
      disabled={isDisabled}
    >
      <ButtonContent>
        {isLoading && <LoadingSpinner />}
        {getButtonText()}
      </ButtonContent>
    </SwapButton>
  );
};