import styled from 'styled-components';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DesktopBaseModal } from '@/components/Desktop/modals/shared/DesktopBaseModal';

const InputSection = styled.div`
  margin-bottom: 8px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const InputGroup = styled.div`
  position: relative;
`;

const Input = styled.input<{ disabled?: boolean }>`
  width: 100%;
  padding: 16px 16px 16px 140px;
  border: 2px solid ${props => props.disabled ? '#f1f5f9' : '#e5e7eb'};
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s;
  background: ${props => props.disabled ? '#f8fafc' : 'white'};
  color: ${props => props.disabled ? '#9ca3af' : '#1e293b'};

  &:focus:not(:disabled) {
    border-color: #06C755;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const TokenSelector = styled.div<{ disabled?: boolean }>`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: ${props => props.disabled ? '#f1f5f9' : '#f8fafc'};
  border: 1px solid ${props => props.disabled ? '#e5e7eb' : '#d1d5db'};
  border-radius: 8px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #06C755;
  }
`;

const TokenIconContainer = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
`;

const TokenIcon = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
`;

const TokenFallback = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #06C755, #05a048);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
`;

const TokenInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const TokenSymbol = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  line-height: 1;
`;

const TokenName = styled.span`
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
`;

const BalanceDisplay = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BalanceText = styled.span`
  color: #64748b;
`;

const MaxButton = styled.button`
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #06C755;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #06C755;
    color: white;
    border-color: #06C755;
  }
`;

const USDDisplay = styled.div`
  font-size: 12px;
  color: #374151;
  margin-top: 2px;
  font-weight: 500;
`;

const LoadingPlaceholder = styled.span`
  color: #9ca3af;
  font-style: italic;
`;

const ChevronIcon = styled(ChevronDown)<{ disabled?: boolean }>`
  width: 16px;
  height: 16px;
  color: ${props => props.disabled ? '#9ca3af' : '#64748b'};
  flex-shrink: 0;
`;

// Modal content styles
const TokenListContainer = styled.div`
  padding: 16px;
`;

const TokenListItem = styled.button`
  width: 100%;
  padding: 16px;
  border: none;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
  margin-bottom: 8px;

  &:hover {
    background: #f8fafc;
    border-color: #06C755;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ModalTokenIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
`;

const ModalTokenImg = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
`;

const ModalTokenFallback = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #06C755, #05a048);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
`;

const ModalTokenInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  text-align: left;
`;

const ModalTokenSymbol = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
`;

const ModalTokenName = styled.span`
  font-size: 14px;
  color: #64748b;
`;

interface DesktopSwapInputProps {
  label: string;
  token: any;
  amount: string;
  balance: string;
  onAmountChange?: (amount: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  showTokenSelector?: boolean;
  availableTokens?: any[];
  onTokenSelect?: (token: any) => void;
  // USD price props
  usdValue?: number | null;
  getFormattedUSDValue?: (amount: string, tokenSymbol: string) => string;
  pricesLoading?: boolean;
}

export const DesktopSwapInput = ({
  label,
  token,
  amount,
  balance,
  onAmountChange,
  readOnly = false,
  disabled = false,
  placeholder = "0.00",
  showTokenSelector = false,
  availableTokens = [],
  onTokenSelect,
  // USD price props
  usdValue,
  getFormattedUSDValue,
  pricesLoading
}: DesktopSwapInputProps) => {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const getTokenIcon = (symbol: string) => {
    if (symbol === 'KUB') {
      return 'https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png';  
    }
    if (symbol === 'KKUB') {
      return 'https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png';
    }
    if (symbol === 'KAIA') {
      return '/images/kaia-token-icon.png';
    }
    if (symbol === 'WKAIA') {
      return '/images/kaia-token-icon.png'; // Use same icon for now
    }
    if (symbol === 'KLAW') {
      return '/images/token-icons/klaw-icon.png';
    }
    return null;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const handleMaxClick = () => {
    if (onAmountChange && !readOnly && balance) {
      onAmountChange(balance);
    }
  };

  const handleTokenSelectorClick = () => {
    if (!disabled && showTokenSelector) {
      setIsModalOpen(true);
    }
  };

  const handleTokenSelect = (selectedToken: any) => {
    if (onTokenSelect) {
      onTokenSelect(selectedToken);
    }
    setIsModalOpen(false);
  };
 

  

  return (
    <>
      <InputSection>
        <Label>{label}</Label>
        <InputGroup>
          <TokenSelector onClick={handleTokenSelectorClick} disabled={disabled || !showTokenSelector}>
            <TokenIconContainer>
              {getTokenIcon(token?.symbol) ? (
                <TokenIcon 
                  src={getTokenIcon(token?.symbol) || ''} 
                  alt={token?.symbol} 
                />
              ) : (
                <TokenFallback>
                  {token?.symbol?.charAt(0) || '?'}
                </TokenFallback>
              )}
            </TokenIconContainer>
            <TokenInfo>
              <TokenSymbol>{token?.symbol || 'Select'}</TokenSymbol>
            </TokenInfo>
            <ChevronIcon disabled={disabled || !showTokenSelector} />
          </TokenSelector>
          <Input
            type="number"
            placeholder={placeholder}
            value={amount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            readOnly={readOnly}
            disabled={disabled}
          />
        </InputGroup>
        <BalanceDisplay>
          <BalanceText>Balance: {formatBalance(balance)} {token?.symbol}</BalanceText>
          {!readOnly && !disabled && parseFloat(balance) > 0 && (
            <MaxButton onClick={handleMaxClick}>MAX</MaxButton>
          )}
        </BalanceDisplay>
        
        {/* USD Value Display */}
        {amount && amount !== '0' && (
          <USDDisplay>
            {pricesLoading ? (
              <LoadingPlaceholder>Loading price...</LoadingPlaceholder>
            ) : usdValue !== null && usdValue !== undefined ? (
              `≈ $${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ) : (
              <LoadingPlaceholder>Price unavailable</LoadingPlaceholder>
            )}
          </USDDisplay>
        )}
      </InputSection>

      <DesktopBaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Token"
        width="400px"
      >
        <TokenListContainer>
          {availableTokens.map((availableToken) => (
            <TokenListItem
              key={availableToken.address}
              onClick={() => handleTokenSelect(availableToken)}
              disabled={availableToken.address === token?.address}
            >
              <ModalTokenIcon>
                {getTokenIcon(availableToken.symbol) ? (
                  <ModalTokenImg 
                    src={getTokenIcon(availableToken.symbol) || ''} 
                    alt={availableToken.symbol} 
                  />
                ) : (
                  <ModalTokenFallback>
                    {availableToken.symbol.charAt(0)}
                  </ModalTokenFallback>
                )}
              </ModalTokenIcon>
              <ModalTokenInfo>
                <ModalTokenSymbol>{availableToken.symbol}</ModalTokenSymbol>
                <ModalTokenName>{availableToken.name}</ModalTokenName>
              </ModalTokenInfo>
            </TokenListItem>
          ))}
        </TokenListContainer>
      </DesktopBaseModal>
    </>
  );
};
