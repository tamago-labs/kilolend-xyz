import styled from 'styled-components';
import { ArrowUpDown } from 'lucide-react';
import { DesktopSwapInput } from './DesktopSwapInput';
import { DesktopSwapQuote } from './DesktopSwapQuote';
import { DesktopSwapButton } from './DesktopSwapButton'; 
import useTokenBalance from '@/hooks/useTokenBalance';
import { useEffect } from 'react';

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
  isTyping?: boolean;
  isConnected: boolean;
  tick: number;
  isSupportedChain: boolean;
  onAmountChange: (amount: string) => void;
  onSwap: () => void;
  onSwapTokens: () => void;
  onApprove?: () => void;
  availableTokens?: any[];
  onFromTokenSelect?: (token: any) => void;
  onToTokenSelect?: (token: any) => void;
  // USD price props
  prices?: Record<string, any>;
  getFormattedPrice?: (symbol: string) => string;
  getFormattedUSDValue?: (amount: string, tokenSymbol: string) => string;
  fromUSDValue?: number | null;
  toUSDValue?: number | null;
  minimumReceivedUSD?: number | null;
  pricesLoading?: boolean;
}

export const DesktopSwapCard = ({
  fromToken,
  toToken,
  amount,
  quote,
  isLoading,
  tick,
  isTyping = false,
  isConnected,
  isSupportedChain,
  onAmountChange,
  onSwap,
  onSwapTokens,
  onApprove,
  availableTokens = [],
  onFromTokenSelect,
  onToTokenSelect,
  // USD price props
  prices,
  getFormattedPrice,
  getFormattedUSDValue,
  fromUSDValue,
  toUSDValue,
  minimumReceivedUSD,
  pricesLoading
}: DesktopSwapCardProps) => {

  // Get token balances
  const { balance: fromTokenBalance, refetch: fromTokenRefetch } = useTokenBalance(fromToken);
  const { balance: toTokenBalance, refetch: toTokenRefetch } = useTokenBalance(toToken);

  useEffect(() => {
    if (tick !== 1) {
      fromTokenRefetch()
      toTokenRefetch()
    } 
  }, [tick])

  const getTokenInfo = (address: string) => {
    // Find token in availableTokens array
    const token = availableTokens.find(t => t.address === address);
    if (token) {
      return {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        decimals: token.decimals || 18,
        icon: token.icon
      };
    }
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
          showTokenSelector={true}
          availableTokens={availableTokens}
          onTokenSelect={onFromTokenSelect}
          usdValue={fromUSDValue}
          getFormattedUSDValue={getFormattedUSDValue}
          pricesLoading={pricesLoading}
        />
      </SwapSection>

      <SwapIconContainer>
        <SwapIconButton
          onClick={onSwapTokens}
          disabled={!isConnected || !isSupportedChain || isLoading}
        >
          <ArrowUpDown size={20} />
        </SwapIconButton>
      </SwapIconContainer>

      <SwapSection>
        <DesktopSwapInput
          label="To"
          token={toTokenInfo}
          amount={isTyping ? '' : (quote?.amountOut || '')}
          balance={toTokenBalance}
          readOnly
          disabled={!isConnected || !isSupportedChain}
          placeholder={isTyping ? 'Calculating...' : '0.00'}
          showTokenSelector={true}
          availableTokens={availableTokens}
          onTokenSelect={onToTokenSelect}
          usdValue={toUSDValue}
          getFormattedUSDValue={getFormattedUSDValue}
          pricesLoading={pricesLoading}
        />
      </SwapSection>

      {quote && (
        <DesktopSwapQuote
          quote={quote}
          fromTokenSymbol={fromTokenInfo?.symbol || ''}
          toTokenSymbol={toTokenInfo?.symbol || ''}
          minimumReceivedUSD={minimumReceivedUSD}
          getFormattedUSDValue={getFormattedUSDValue}
          pricesLoading={pricesLoading}
        />
      )}

      {/* <DesktopSlippageWarning
        slippage={quote?.slippage || 5}
        isHighSlippage={(quote?.slippage || 5) >= 5}
        isMemeMode={toTokenInfo?.symbol === 'KLAW'}
      /> */}

      <DesktopSwapButton
        amount={amount}
        quote={quote}
        isLoading={isLoading}
        isConnected={isConnected}
        isSupportedChain={isSupportedChain}
        fromToken={fromToken}
        toToken={toToken}
        onSwap={onSwap}
        onApprove={onApprove || (() => { })}
      />
    </SwapCard>
  );
};