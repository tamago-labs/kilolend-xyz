import styled from 'styled-components';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DesktopBaseModal } from '@/components/Desktop/modals/shared/DesktopBaseModal';

const SelectorContainer = styled.div`
  position: relative;
`;

const SelectorButton = styled.button<{ disabled?: boolean }>`
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
  width: 100%;

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
  flex: 1;
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

interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  isNative?: boolean;
}

interface DesktopTokenSelectorProps {
  selectedToken: string;
  tokens: TokenOption[];
  onSelect: (token: TokenOption) => void;
  disabled?: boolean;
}

export const DesktopTokenSelector = ({
  selectedToken,
  tokens,
  onSelect,
  disabled = false
}: DesktopTokenSelectorProps) => {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const selectedTokenData = tokens.find(t => t.address === selectedToken) || tokens[0];

  const getTokenIcon = (symbol: string) => {
    if (symbol === 'KUB') {
      return 'https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png';
    }
    if (symbol === 'KKUB') {
      return 'https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png';
    }
    if (symbol === 'KLAW') {
      return '/images/token-icons/klaw-icon.png';
    }
    return null;
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsModalOpen(!isModalOpen);
    }
  };

  const handleSelect = (token: TokenOption) => {
    onSelect(token);
    setIsModalOpen(false);
  }; 

  return (
    <>
      <SelectorContainer>
        <SelectorButton onClick={handleToggle} disabled={disabled}>
          <TokenIconContainer>
            {getTokenIcon(selectedTokenData?.symbol) ? (
              <TokenIcon 
                src={getTokenIcon(selectedTokenData?.symbol) || ''} 
                alt={selectedTokenData?.symbol} 
              />
            ) : (
              <TokenFallback>
                {selectedTokenData?.symbol?.charAt(0) || '?'}
              </TokenFallback>
            )}
          </TokenIconContainer>
          <TokenInfo>
            <TokenSymbol>{selectedTokenData?.symbol || 'Unknown'}</TokenSymbol>
            <TokenName>{selectedTokenData?.name || ''}</TokenName>
          </TokenInfo>
          <ChevronIcon disabled={disabled} />
        </SelectorButton>
      </SelectorContainer>

      <DesktopBaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Token"
        width="400px"
      >
        <TokenListContainer>
          {tokens.map((token) => (
            <TokenListItem
              key={token.address}
              onClick={() => handleSelect(token)}
              disabled={token.address === selectedToken}
            >
              <ModalTokenIcon>
                {getTokenIcon(token.symbol) ? (
                  <ModalTokenImg 
                    src={getTokenIcon(token.symbol) || ''} 
                    alt={token.symbol} 
                  />
                ) : (
                  <ModalTokenFallback>
                    {token.symbol.charAt(0)}
                  </ModalTokenFallback>
                )}
              </ModalTokenIcon>
              <ModalTokenInfo>
                <ModalTokenSymbol>{token.symbol}</ModalTokenSymbol>
                <ModalTokenName>{token.name}</ModalTokenName>
              </ModalTokenInfo>
            </TokenListItem>
          ))}
        </TokenListContainer>
      </DesktopBaseModal>
    </>
  );
};
