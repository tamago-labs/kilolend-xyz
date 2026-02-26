"use client";

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { aiWalletService, WithdrawResponse, AIWalletStatus } from '@/services/aiWalletService';
import { useWalletAccountStore } from '@/components/Wallet/Account/auth.hooks';
import { useAITokenBalancesV2, AITokenBalance } from '@/hooks/v2/useAITokenBalancesV2';
import { usePriceUpdates } from '@/hooks/usePriceUpdates';
import { getTokenIcon } from '@/utils/chainConfig';
import {
  ContentCard,
  CardHeader,
  CardTitle,
  ChainSelectorContainer,
  ChainSelectorLabel,
  ChainSelect,
  TokenRow,
  TokenInfo,
  TokenIcon,
  TokenDetails,
  TokenSymbol,
  TokenName,
  TokenAmount,
  TokenUSD,
  FormContainer,
  FormGroup,
  FormLabel,
  FormSelect,
  FormInput,
  Button,
  ActionButtons,
} from '../DesktopAgentWalletsV2Page.styles';

interface WithdrawContentProps {
  aiWalletData: AIWalletStatus | null;
  isLoadingAIWallet: boolean;
}

const CHAINS = [
  { id: 8217, name: 'KAIA', icon: '/images/blockchain-icons/kaia-token-icon.png' },
  { id: 96, name: 'KUB', icon: '/images/blockchain-icons/kub-chain-icon.png' },
  { id: 128123, name: 'Etherlink', icon: '/images/blockchain-icons/etherlink-token-icon.png' },
];

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const LoadingCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  max-width: 400px;
  width: 90%;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #06C755;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
`;

const LoadingText = styled.p`
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const LoadingSubtext = styled.p`
  color: #64748b;
  font-size: 14px;
  margin: 0;
`;

const SuccessModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const SuccessModalCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  max-width: 400px;
  width: 90%;
`;

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #d1fae5, #ecfdf5);
  border: 2px solid #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
`;

const SuccessTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #065f46;
  margin: 0 0 12px 0;
`;

const SuccessText = styled.p`
  font-size: 16px;
  color: #1e293b;
  margin: 0 0 20px 0;
  line-height: 1.6;
`;

const TransactionLink = styled.a`
  color: #065f46;
  text-decoration: underline;
  font-size: 14px;
  font-weight: 600;
  display: block;
  margin-bottom: 24px;
  
  &:hover {
    color: #047857;
  }
`;

const SuccessButton = styled.button`
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  
  &:hover {
    background: #059669;
  }
`;

const ErrorBanner = styled.div`
  background: linear-gradient(135deg, #fee2e2, #fef2f2);
  border: 1px solid #ef4444;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const ErrorIcon = styled.div`
  width: 32px;
  height: 32px;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.h4`
  font-size: 16px;
  font-weight: 700;
  color: #991b1b;
  margin: 0 0 8px 0;
`;

const ErrorText = styled.p`
  font-size: 14px;
  color: #b91c1c;
  margin: 0;
  line-height: 1.6;
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 12px;
  
  &:hover {
    opacity: 0.8;
  }
`;

const RefreshIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #065f46;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  font-weight: 500;
`;

const RefreshSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid #d1fae5;
  border-top: 2px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
`;


// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { 
      opacity: 0;
      transform: translateY(-10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0% { 
      background-color: #d1fae5;
      border-color: #10b981;
    }
    50% { 
      background-color: #ecfdf5;
      border-color: #059669;
    }
    100% { 
      background-color: #d1fae5;
      border-color: #10b981;
    }
  }
`;
if (!document.head.querySelector('style[data-kilolend-animations]')) {
  style.setAttribute('data-kilolend-animations', 'true');
  document.head.appendChild(style);
}

export const WithdrawContent: React.FC<WithdrawContentProps> = ({ 
  aiWalletData, 
  isLoadingAIWallet 
}) => {
  const [selectedChain, setSelectedChain] = useState<number>(8217);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState<boolean>(false);
  const [balanceRefreshError, setBalanceRefreshError] = useState<string | null>(null);
  const [refreshCompleted, setRefreshCompleted] = useState<boolean>(false);
  
  // Get user address from wallet store
  const { account } = useWalletAccountStore();
  const userAddress = account;

  // Fetch AI wallet balances
  const { balances: aiBalances, getBalancesByChain, isLoading: isBalancesLoading, refetch } = useAITokenBalancesV2(
    aiWalletData?.aiWalletAddress || null
  );

  // Fetch prices for USD calculations
  const { prices } = usePriceUpdates({
    symbols: ["KAIA", "USDT", "stKAIA", "MBX", "BORA", "SIX", "XTZ", "KUB"]
  });

  // Get balances for selected chain
  const chainBalances = getBalancesByChain(selectedChain);

  // Filter tokens with non-zero balances
  const availableTokens = chainBalances.filter(token => 
    parseFloat(token.balance) > 0
  );

  // Helper function to get price for a token symbol
  const getTokenPrice = useCallback((symbol: string): number => {
    // Handle special price mappings
    const priceMap: Record<string, string | number> = {
      'MBX': 'MARBLEX',
      'KKUB': 'KUB',
      'KUSDT': 'USDT',
      'USDC': 1, // USDC is pegged to USD
      'WXTZ': 'XTZ',
      'STAKED_KAIA' : "stKAIA"
    };

    const mappedPriceKey = priceMap[symbol];

    // If mappedPriceKey is a number (1 for USDC), return it directly
    if (typeof mappedPriceKey === 'number') {
      return mappedPriceKey;
    }

    // Otherwise, look up of price in prices object
    const priceKey = mappedPriceKey || symbol;
    const price = prices[priceKey];
    return price ? price.price : 0;
  }, [prices]);

  // Calculate USD value for a token
  const getTokenUSDValue = useCallback((balance: string, symbol: string): number => {
    const price = getTokenPrice(symbol);
    const balanceFloat = parseFloat(balance);
    return price * balanceFloat;
  }, [getTokenPrice]);

  const handleMaxClick = () => {
    const token = availableTokens.find(t => t.symbol === selectedToken);
    if (token) {
      setWithdrawAmount(token.balance);
    }
  };

  const handleBalanceRefresh = async () => {
    if (!aiWalletData?.aiWalletAddress) return;
    
    setIsRefreshingBalances(true);
    setBalanceRefreshError(null);
    
    try {
      await refetch();
      setRefreshCompleted(true);
    } catch (error) {
      console.error('Balance refresh failed:', error);
      setBalanceRefreshError('Failed to refresh balances. Please check manually.');
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userAddress || !selectedToken || !withdrawAmount) {
      setWithdrawError('Missing required information for withdrawal');
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError(null);
    setWithdrawResult(null);
    setRefreshCompleted(false);

    try {
      console.log('Starting withdrawal...', {
        userAddress,
        selectedToken,
        withdrawAmount,
        selectedChain
      });

      const result = await aiWalletService.withdrawToken(
        userAddress,
        selectedToken,
        withdrawAmount,
        selectedChain
      );
      
      console.log('Withdrawal result:', result);
      
      // Ensure we always have a success response
      const successResult = {
        success: true,
        transaction_hash: result.transaction_hash,
        amount: withdrawAmount,
        token_symbol: selectedToken,
        explorer_url: result.explorer_url,
        message: result.message || 'Withdrawal successful',
        recipient: userAddress,
        chain_id: selectedChain
      };
      
      setWithdrawResult(successResult);
      
      // Reset form on success
      setWithdrawAmount('');
      setSelectedToken('');
      
      // Auto-refresh balances after successful withdrawal (non-blocking)
      setTimeout(() => {
        console.log('Starting balance refresh...');
        handleBalanceRefresh();
      }, 2000); // Wait 2 seconds before refreshing to allow blockchain to update
      
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      setWithdrawError(error.message || 'Withdrawal failed. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleWithdraw();
  };

  const dismissSuccess = () => {
    setWithdrawResult(null);
  };

  const dismissError = () => {
    setWithdrawError(null);
  };

  const selectedTokenData = availableTokens.find(t => t.symbol === selectedToken);
  const selectedTokenUSDValue = selectedTokenData 
    ? getTokenUSDValue(selectedTokenData.balance, selectedTokenData.symbol)
    : 0;

  const selectedChainInfo = CHAINS.find(c => c.id === selectedChain) || CHAINS[0];

  // Show loading state
  if (isLoadingAIWallet || isBalancesLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '80px 40px',
        gap: '20px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #06C755',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#64748b', fontSize: '16px' }}>Loading AI wallet balances...</p>
      </div>
    );
  }

  return (
    <>
      {/* Success Modal */}
      {withdrawResult && withdrawResult.success && (
        <SuccessModal>
          <SuccessModalCard>
            <SuccessIcon>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </SuccessIcon>
            <SuccessTitle>
              {isRefreshingBalances ? 'Updating Balances...' : 'Withdrawal Complete!'}
            </SuccessTitle>
            <SuccessText>
              Successfully withdrew {withdrawResult.amount} {withdrawResult.token_symbol || 'tokens'} to your main wallet.
              {withdrawResult.transaction_hash && (
                <>
                  <br />
                  <small style={{ fontSize: '14px', color: '#64748b' }}>
                    Transaction: {withdrawResult.transaction_hash.slice(0, 10)}...{withdrawResult.transaction_hash.slice(-8)}
                  </small>
                </>
              )}
            </SuccessText>
            
            {isRefreshingBalances && (
              <RefreshIndicator>
                <RefreshSpinner />
                Updating your AI wallet balance...
              </RefreshIndicator>
            )}
            
            {/*{refreshCompleted && !isRefreshingBalances && (
              <div style={{ 
                background: '#d1fae5', 
                color: '#065f46', 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '16px'
              }}>
                ✅ Balance Refresh Complete! Your AI wallet balances have been updated.
              </div>
            )}*/}
            
           {/* {balanceRefreshError && (
              <div style={{ 
                background: '#fee2e2', 
                color: '#dc2626', 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '14px',
                marginTop: '16px'
              }}>
                ⚠️ {balanceRefreshError}
              </div>
            )}
            */}
            {withdrawResult.explorer_url && (
              <TransactionLink 
                href={withdrawResult.explorer_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View on Explorer →
              </TransactionLink>
            )}
            
            <SuccessButton onClick={dismissSuccess}>
              {isRefreshingBalances ? 'Processing...' : 'Done'}
            </SuccessButton>
          </SuccessModalCard>
        </SuccessModal>
      )}

      {/* Error Banner */}
      {withdrawError && (
        <ErrorBanner>
          <ErrorIcon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6"/>
              <path d="M9 9l6 6"/>
            </svg>
          </ErrorIcon>
          <ErrorContent>
            <ErrorTitle>Withdrawal Failed</ErrorTitle>
            <ErrorText>{withdrawError}</ErrorText>
            <DismissButton onClick={dismissError}>
              Dismiss
            </DismissButton>
          </ErrorContent>
        </ErrorBanner>
      )}

      {/* Chain Selector */}
      <ChainSelectorContainer>
        <ChainSelectorLabel>Current Chain:</ChainSelectorLabel>
        <ChainSelect
          value={selectedChain}
          onChange={(e) => {
            setSelectedChain(Number(e.target.value));
            setSelectedToken('');
            setWithdrawAmount('');
            setWithdrawError(null);
            setWithdrawResult(null);
          }}
        >
          {CHAINS.map(chain => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </ChainSelect>
      </ChainSelectorContainer>

      {/* AI Wallet Balance Card */}
      <ContentCard>
        <CardHeader>
          <CardTitle>Agent Wallet Balance</CardTitle>
        </CardHeader>
        
        {availableTokens.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#64748b',
            fontSize: '14px'
          }}>
            No tokens found in Agent Wallet on {selectedChainInfo.name} chain
          </div>
        ) : (
          availableTokens.map((token) => (
            <TokenRow key={`${token.chainId}-${token.symbol}`}>
              <TokenInfo>
                <TokenIcon src={getTokenIcon(token.symbol) || '/images/icon-token.png'} alt={token.symbol} />
                <TokenDetails>
                  <TokenSymbol>{token.symbol}</TokenSymbol>
                  <TokenName>{token.name}</TokenName>
                </TokenDetails>
              </TokenInfo>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <TokenAmount style={{ fontWeight: 600, fontSize: '16px' }}>
                  {token.balance}
                </TokenAmount>
                <TokenUSD style={{ color: '#64748b', fontSize: '13px' }}>
                  ${getTokenUSDValue(token.balance, token.symbol).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </TokenUSD>
              </div>
            </TokenRow>
          ))
        )}
      </ContentCard>

      {/* Withdraw Form */}
      <ContentCard>
        <CardHeader>
          <CardTitle>Withdraw from Agent Wallet</CardTitle>
        </CardHeader>
        
        {availableTokens.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#64748b',
            fontSize: '14px'
          }}>
            No tokens available to withdraw on {selectedChainInfo.name} chain
          </div>
        ) : (
          <FormContainer onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel>Select Token</FormLabel>
              <FormSelect
                value={selectedToken}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setSelectedToken(e.target.value);
                  setWithdrawAmount('');
                  setWithdrawError(null);
                  setWithdrawResult(null);
                }}
              >
                <option value="">Choose a token...</option>
                {availableTokens.map(token => (
                  <option key={`${token.chainId}-${token.symbol}`} value={token.symbol}>
                    {token.symbol} - {token.name} (Available: {token.balance})
                  </option>
                ))}
              </FormSelect>
            </FormGroup>

            {selectedToken && (
              <>
                <FormGroup>
                  <FormLabel>Amount</FormLabel>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <FormInput
                      type="number"
                      value={withdrawAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setWithdrawAmount(e.target.value);
                        setWithdrawError(null);
                        setWithdrawResult(null);
                      }}
                      placeholder="0.00"
                      style={{ flex: 1 }}
                      max={selectedTokenData?.balance || ''}
                    />
                    <Button type="button" onClick={handleMaxClick} $variant="secondary">
                      MAX
                    </Button>
                  </div>
                </FormGroup>

                {selectedTokenData && withdrawAmount && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    <span>Available:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedTokenData.balance} {selectedTokenData.symbol} 
                      ($ {selectedTokenUSDValue.toLocaleString('en-US', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })})
                    </span>
                  </div>
                )}

                <ActionButtons>
                  <Button 
                    type="submit" 
                    $variant="primary" 
                    style={{ flex: 1 }}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || isWithdrawing}
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </Button>
                </ActionButtons>
              </>
            )}
          </FormContainer>
        )}
      </ContentCard>

      {/* Loading Overlay */}
      {isWithdrawing && (
        <LoadingOverlay>
          <LoadingCard>
            <LoadingSpinner />
            <LoadingText>Processing Withdrawal</LoadingText>
            <LoadingSubtext>Withdrawing {withdrawAmount} {selectedToken} to your main wallet...</LoadingSubtext>
          </LoadingCard>
        </LoadingOverlay>
      )}
    </>
  );
};