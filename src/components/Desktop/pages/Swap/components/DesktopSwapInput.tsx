import styled from 'styled-components';

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
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 110px;
`;

const TokenIcon = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: contain;
`;

const TokenFallback = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #06C755;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 700;
`;

const TokenSymbol = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
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

interface DesktopSwapInputProps {
  label: string;
  token: any;
  amount: string;
  balance: string;
  onAmountChange?: (amount: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
}

export const DesktopSwapInput = ({
  label,
  token,
  amount,
  balance,
  onAmountChange,
  readOnly = false,
  disabled = false
}: DesktopSwapInputProps) => {

  const getTokenIcon = (symbol: string) => {
    if (symbol === 'KLAW' || symbol === 'KKUB') {
      return 'https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png';
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

  return (
    <InputSection>
      <Label>{label}</Label>
      <InputGroup>
        <TokenSelector disabled={disabled}>
          {getTokenIcon(token?.symbol) ? (
            <TokenIcon 
              src={getTokenIcon(token?.symbol) || ''} 
              alt={token?.symbol}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                if (img.parentElement) {
                  img.parentElement.innerHTML = `<div style="width: 20px; height: 20px; border-radius: 50%; background: #06C755; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700;">${token?.symbol?.charAt(0) || '?'}</div>`;
                }
              }}
            />
          ) : (
            <TokenFallback>
              {token?.symbol?.charAt(0) || '?'}
            </TokenFallback>
          )}
          <TokenSymbol>{token?.symbol || 'Unknown'}</TokenSymbol>
        </TokenSelector>
        <Input
          type="number"
          placeholder="0.00"
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
    </InputSection>
  );
};