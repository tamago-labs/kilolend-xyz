import styled from 'styled-components';
import { DesktopSwapInput } from './DesktopSwapInput';
import { DesktopSwapQuote } from './DesktopSwapQuote';
import { DesktopSwapButton } from './DesktopSwapButton';
import { KUB_DEX_CONTRACTS } from '@/hooks/useDEXQuote';
import { KUB_TOKENS } from '@/config/tokens';
import useTokenBalance from '@/hooks/useTokenBalance';

const SwapCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;

  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const SwapSection = styled.div`
  margin-bottom: 16px;
`;

const SwapIconContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 12px 0;
`;

const SwapIconButton = styled.button<{ disabled?: boolean }>`
  background: ${props => props.disabled ? '#f1f5f9' : '#06C755'};
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  color: ${props => props.disabled ? '#9ca3af' : 'white'};
  font-size: 18px;

  &:hover:not(:disabled) {
    background: #05a048;
    transform: scale(1.05);
  }
`;

interface DesktopSwapCardProps {
  fromToken: string;
  toToken: string;
  amount: string;
  quote: any;
  isLoading: boolean;
  isConnected: boolean;
  isSupportedChain: boolean;
  onAmountChange: (amount: string) => void;
  onSwap: () => void;
  onSwapTokens: () => void;
}

export const DesktopSwapCard = ({
  fromToken,
  toToken,
  amount,
  quote,
  isLoading,
  isConnected,
  isSupportedChain,
  onAmountChange,
  onSwap,
  onSwapTokens
}: DesktopSwapCardProps) => {
  
  // Get token balances
  const { balance: fromTokenBalance } = useTokenBalance(fromToken);
  const { balance: toTokenBalance } = useTokenBalance(toToken);

  const getTokenInfo = (address: string) => {
    if (address === KUB_DEX_CONTRACTS.KLAW) return KUB_TOKENS.KLAW;
    if (address === KUB_DEX_CONTRACTS.KKUB) return KUB_TOKENS.KKUB;
    return null;
  };

  const fromTokenInfo = getTokenInfo(fromToken);
  const toTokenInfo = getTokenInfo(toToken);

  return (
    <SwapCard>
      <SwapSection>
        <DesktopSwapInput
          label="From"
          token={fromTokenInfo}
          amount={amount}
          balance={fromTokenBalance}
          onAmountChange={onAmountChange}
          disabled={!isConnected || !isSupportedChain || isLoading}
        />
      </SwapSection>

      <SwapIconContainer>
        <SwapIconButton 
          onClick={onSwapTokens}
          disabled={!isConnected || !isSupportedChain || isLoading}
        >
          ⇅
        </SwapIconButton>
      </SwapIconContainer>

      <SwapSection>
        <DesktopSwapInput
          label="To"
          token={toTokenInfo}
          amount={quote?.amountOut || ''}
          balance={toTokenBalance}
          readOnly
          disabled={!isConnected || !isSupportedChain}
        />
      </SwapSection>

      {quote && (
        <DesktopSwapQuote 
          quote={quote}
          fromTokenSymbol={fromTokenInfo?.symbol || ''}
          toTokenSymbol={toTokenInfo?.symbol || ''}
        />
      )}

      <DesktopSwapButton
        amount={amount}
        quote={quote}
        isLoading={isLoading}
        isConnected={isConnected}
        isSupportedChain={isSupportedChain}
        onSwap={onSwap}
      />
    </SwapCard>
  );
};