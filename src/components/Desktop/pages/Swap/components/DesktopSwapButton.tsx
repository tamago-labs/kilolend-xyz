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

import { useAllowanceV2 } from '@/hooks/useAllowanceV2';
import { CHAIN_CONTRACTS } from '@/utils/chainConfig';
import { useDEXQuoteV2 } from '@/hooks/useDEXQuoteV2';
import { useChainId } from 'wagmi';

interface DesktopSwapButtonProps {
  amount: string;
  quote: any;
  isLoading: boolean;
  isConnected: boolean;
  isSupportedChain: boolean;
  fromToken: string;
  toToken: string;
  onSwap: () => void;
  onApprove: () => void;
}

export const DesktopSwapButton = ({
  amount,
  quote,
  isLoading,
  isConnected,
  isSupportedChain,
  fromToken,
  toToken,
  onSwap,
  onApprove
}: DesktopSwapButtonProps) => {
  
  // Get current chain and contracts
  const { isSupportedChain: isChainSupported } = useDEXQuoteV2();
  const chainId = useChainId();
  
  // Get router address for current chain
  const getRouterAddress = () => {
    if (chainId === 8217) return CHAIN_CONTRACTS.kaia.Router; // KAIA
    if (chainId === 96) return CHAIN_CONTRACTS.kub.Router; // KUB
    return null;
  };

  const routerAddress = getRouterAddress();

  // Check allowance for the input token
  const { allowance, isSufficient, isLoading: isAllowanceLoading } = useAllowanceV2(
    fromToken,
    routerAddress || undefined,
    amount
  );

  const getButtonText = () => {
    if (isLoading || isAllowanceLoading) {
      return 'Processing...';
    }
    
    if (!isConnected) {
      return 'Connect Wallet';
    }
    
    if (!isSupportedChain) {
      return 'Switch to Supported Chain';
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return 'Enter Amount';
    }
    
    if (!quote) {
      return 'Fetching Quote...';
    }
    
    // Get native token addresses for current chain
    const getNativeAddress = () => {
      if (chainId === 8217) return CHAIN_CONTRACTS.kaia.KAIA; // KAIA
      if (chainId === 96) return CHAIN_CONTRACTS.kub.KUB; // KUB
      return null;
    };
    
    const nativeAddress = getNativeAddress();
    
    // Check if approval is needed (skip for native tokens)
    if (!isSufficient && fromToken !== nativeAddress) {
      return 'Approve';
    }
    
    return 'Swap';
  };

  const handleClick = () => {
    const getNativeAddress = () => {
      if (chainId === 8217) return CHAIN_CONTRACTS.kaia.KAIA; // KAIA
      if (chainId === 96) return CHAIN_CONTRACTS.kub.KUB; // KUB
      return null;
    };
    
    const nativeAddress = getNativeAddress();
    
    if (!isSufficient && fromToken !== nativeAddress) {
      onApprove();
    } else {
      onSwap();
    }
  };

  const isDisabled = !isConnected || 
                     !isSupportedChain || 
                     !amount || 
                     parseFloat(amount) <= 0 || 
                     !quote || 
                     isLoading ||
                     isAllowanceLoading;

  // Different styling for approve vs swap
  const getNativeAddress = () => {
    if (chainId === 8217) return CHAIN_CONTRACTS.kaia.KAIA; // KAIA
    if (chainId === 96) return CHAIN_CONTRACTS.kub.KUB; // KUB
    return null;
  };
  
  const nativeAddress = getNativeAddress();
  const buttonStyle = !isSufficient && amount && parseFloat(amount) > 0 && quote && fromToken !== nativeAddress ? {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  } : {};

  return (
    <SwapButton
      onClick={handleClick}
      disabled={isDisabled}
      style={buttonStyle}
    >
      <ButtonContent>
        {(isLoading || isAllowanceLoading) && <LoadingSpinner />}
        {getButtonText()}
      </ButtonContent>
    </SwapButton>
  );
};
