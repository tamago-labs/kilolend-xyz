import styled from 'styled-components';

const QuoteContainer = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  border: 1px solid #e2e8f0;
`;

const QuoteTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const QuoteIcon = styled.span`
  font-size: 16px;
`;

const QuoteRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const QuoteLabel = styled.span`
  font-size: 14px;
  color: #64748b;
`;

const QuoteValue = styled.span<{ highlighted?: boolean }>`
  font-size: 14px;
  font-weight: ${props => props.highlighted ? '700' : '600'};
  color: ${props => props.highlighted ? '#06C755' : '#1e293b'};
`;

const Divider = styled.div`
  height: 1px;
  background: #e2e8f0;
  margin: 12px 0;
`;

const GasEstimate = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  margin-top: 12px;
`;

const GasIcon = styled.span`
  font-size: 14px;
`;

const USDDisplay = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

interface DesktopSwapQuoteProps {
  quote: any;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  minimumReceivedUSD?: number | null;
  getFormattedUSDValue?: (amount: string, tokenSymbol: string) => string;
  pricesLoading?: boolean;
}

export const DesktopSwapQuote = ({
  quote,
  fromTokenSymbol,
  toTokenSymbol,
  minimumReceivedUSD,
  getFormattedUSDValue,
  pricesLoading
}: DesktopSwapQuoteProps) => {
  
  const formatNumber = (num: number, decimals: number = 4) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  const formatPriceImpact = (impact: number) => {
    if (impact < 0.01) return '< 0.01%';
    return `${impact.toFixed(2)}%`;
  };

  return (
    <QuoteContainer>
      <QuoteTitle> 
        Quote Details
      </QuoteTitle>
      
      <QuoteRow>
        <QuoteLabel>Exchange Rate</QuoteLabel>
        <QuoteValue>
          1 {fromTokenSymbol} = {formatNumber(quote.exchangeRate, 6)} {toTokenSymbol}
        </QuoteValue>
      </QuoteRow>

      <QuoteRow>
        <QuoteLabel>Price Impact</QuoteLabel>
        <QuoteValue highlighted={quote.priceImpact > 1}>
          {formatPriceImpact(quote.priceImpact)}
        </QuoteValue>
      </QuoteRow>

      <Divider />

      <QuoteRow>
        <QuoteLabel>Minimum Received</QuoteLabel>
        <div>
          <QuoteValue highlighted>
            {formatNumber(quote.minimumReceived)} {toTokenSymbol}
          </QuoteValue>
          {minimumReceivedUSD !== null && minimumReceivedUSD !== undefined && (
            <USDDisplay>
              ≈ ${minimumReceivedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </USDDisplay>
          )}
        </div>
      </QuoteRow> 
      <QuoteRow>
        <QuoteLabel>Slippage Tolerance</QuoteLabel>
        <QuoteValue>5.00%</QuoteValue>
      </QuoteRow> 
    </QuoteContainer>
  );
};