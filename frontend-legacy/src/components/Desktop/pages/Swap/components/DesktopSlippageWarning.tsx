import styled from 'styled-components';
import { AlertTriangle, Info } from 'lucide-react';

const WarningContainer = styled.div<{ variant?: 'warning' | 'info' }>`
  background: ${props => props.variant === 'warning' ? '#fef3c7' : '#dbeafe'};
  border: 1px solid ${props => props.variant === 'warning' ? '#f59e0b' : '#3b82f6'};
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const IconContainer = styled.div<{ variant?: 'warning' | 'info' }>`
  color: ${props => props.variant === 'warning' ? '#d97706' : '#2563eb'};
  flex-shrink: 0;
  margin-top: 2px;
`;

const ContentContainer = styled.div`
  flex: 1;
`;

const Title = styled.div<{ variant?: 'warning' | 'info' }>`
  font-weight: 600;
  font-size: 14px;
  color: ${props => props.variant === 'warning' ? '#92400e' : '#1e40af'};
  margin-bottom: 4px;
`;

const Message = styled.div<{ variant?: 'warning' | 'info' }>`
  font-size: 13px;
  color: ${props => props.variant === 'warning' ? '#78350f' : '#1e3a8a'};
  line-height: 1.5;
`;

const SlippageInfo = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #64748b;
`;

interface DesktopSlippageWarningProps {
  slippage: number;
  isHighSlippage?: boolean;
  isMemeMode?: boolean;
}

export const DesktopSlippageWarning = ({
  slippage,
  isHighSlippage = false,
  isMemeMode = false
}: DesktopSlippageWarningProps) => {
  
  if (!isHighSlippage && !isMemeMode) {
    return null;
  }

  const getWarningContent = () => {
    if (isMemeMode) {
      return {
        variant: 'info' as const,
        icon: Info,
        title: 'MEME Coin Launchpad Mode',
        message: `High slippage tolerance (${slippage}%) is set for new token launches. This allows trading in volatile conditions but may result in unfavorable pricing.`
      };
    }

    if (isHighSlippage) {
      return {
        variant: 'warning' as const,
        icon: AlertTriangle,
        title: 'High Slippage Warning',
        message: `Slippage tolerance is set to ${slippage}%. This is unusually high and may result in significant price impact. Consider reducing it for better execution price.`
      };
    }

    return null;
  };

  const content = getWarningContent();
  if (!content) return null;

  const Icon = content.icon;

  return (
    <WarningContainer variant={content.variant}>
      <IconContainer variant={content.variant}>
        <Icon size={18} />
      </IconContainer>
      <ContentContainer>
        <Title variant={content.variant}>
          {content.title}
        </Title>
        <Message variant={content.variant}>
          {content.message}
        </Message>
        {isMemeMode && (
          <SlippageInfo>
            <strong>Tip:</strong> New token launches often have high volatility. 
            Consider starting with smaller test amounts to gauge price impact before larger trades.
          </SlippageInfo>
        )}
      </ContentContainer>
    </WarningContainer>
  );
};