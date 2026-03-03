"use client";

import styled from 'styled-components';
import { useState, useEffect, useCallback } from 'react';
import { useConnection } from 'wagmi';
import { DesktopSwapHeader } from './components/DesktopSwapHeader';
import { DesktopSwapStats } from './components/DesktopSwapStats';
import { DesktopSwapCard } from './components/DesktopSwapCard';
import { DesktopSwapFooter } from './components/DesktopSwapFooter';
import { DesktopSwapErrorMessage } from './components/DesktopSwapErrorMessage';
import { DesktopSwapTransactionModal } from './components/DesktopSwapTransactionModal';
import { DesktopKYCWarning } from './components/DesktopKYCWarning';
import { useDEXQuoteV2 } from '@/hooks/useDEXQuoteV2';
import { useDEXSwapV2 } from '@/hooks/useDEXSwapV2';
import { useDebounce } from '@/hooks/useDebounce';
import { CHAIN_DEX_TOKENS, CHAIN_CONFIGS, CHAIN_CONTRACTS } from '@/utils/chainConfig';
import { useAuth } from '@/contexts/ChainContext';
import { ChainId } from '@/utils/chainConfig';

const SwapContainer = styled.div`
  min-height: 100vh;
  background: #f8fafc;
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
`;

const SwapCentered = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
`;

const SwapCardContainer = styled.div`
  width: 100%;
  max-width: 600px;
`;

export const DesktopSwap = () => {
  const { address } = useConnection();
  const { selectedAuthMethod } = useAuth();
  const { getQuote, isLoading: isQuoteLoading, error: quoteError, isSupportedChain, currentChain, availableTokens } = useDEXQuoteV2();
  const { approveToken, executeSwap, isLoading: isSwapLoading, error: swapError } = useDEXSwapV2();

  const [selectedChain, setSelectedChain] = useState<ChainId>('kaia'); // Default to KAIA for LINE SDK
  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tick, setTick] = useState(1);

  // Set default tokens based on current chain
  useEffect(() => {
    if (availableTokens.length > 0 && !fromToken) {
      const nativeToken = availableTokens.find((t: any) => t.isNative);
      const wrappedToken = availableTokens.find((t: any) => !t.isNative && t.symbol !== 'KLAW');
      const klawToken = availableTokens.find((t: any) => t.symbol === 'KLAW');

      if (nativeToken && wrappedToken) {
        setFromToken(nativeToken.address);
        setToToken(klawToken?.address || wrappedToken.address);
      }
    }
  }, [availableTokens]);

  // Debounce the amount for quote fetching (500ms delay)
  const debouncedAmount = useDebounce(amount, 500);

  // Track if user is currently typing
  useEffect(() => {
    if (amount !== debouncedAmount) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [amount, debouncedAmount]);

  // Memoize the quote fetching function
  const fetchQuote = useCallback(async () => {
    if (!debouncedAmount || parseFloat(debouncedAmount) <= 0 || !isSupportedChain || !fromToken || !toToken) {
      setQuote(null);
      return;
    }

    try {
      const quoteResult = await getQuote({
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: debouncedAmount,
        slippage: 5
      });
      setQuote(quoteResult);
      setError('');
    } catch (err: any) {
      setError(err.message);
      setQuote(null);
    }
  }, [debouncedAmount, fromToken, toToken, isSupportedChain]);

  // Auto-get quote when dependencies change
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleSwap = () => {
    if (!quote || !address) return;
    // Just open the modal - the actual swap logic is in DesktopSwapTransactionModal
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setError('');
  };

  const handleSwapComplete = useCallback(() => {
    // Reset form after successful swap
    setAmount('');
    setQuote(null);
    setError('');
    setTick(tick + 1);
  }, [tick]);

  const handleApprove = async () => {
    if (!address || !currentChain) return;

    try {
      setIsProcessing(true);
      const contracts = currentChain === 'kaia' ? CHAIN_CONTRACTS.kaia : CHAIN_CONTRACTS.kub;
      await approveToken(fromToken, contracts.Router, amount);
      // Approval successful - you can now proceed with swap
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwapTokens = () => {
    const tempFrom = fromToken;
    setFromToken(toToken);
    setToToken(tempFrom);
    setAmount('');
    setQuote(null);
  };

  const isLoading = isQuoteLoading || isSwapLoading;
  const currentError = error || quoteError || swapError;

  // Get token configurations
  const getTokenConfig = (tokenAddress: string) => {
    const token = availableTokens.find((t: any) => t.address === tokenAddress);
    return token || { symbol: 'UNKNOWN', address: tokenAddress, isNative: false };
  };

  const fromTokenConfig = getTokenConfig(fromToken);
  const toTokenConfig = getTokenConfig(toToken);

  const handleFromTokenSelect = (token: any) => {
    if (token.address !== toToken) {
      setFromToken(token.address);
      setAmount('');
      setQuote(null);
    }
  };

  const handleToTokenSelect = (token: any) => {
    if (token.address !== fromToken) {
      setToToken(token.address);
      setQuote(null);
    }
  };

  return (
    <SwapContainer>
      <MainContent>
        <DesktopSwapHeader /> 
        <SwapCentered>
          <SwapCardContainer>
            <DesktopSwapCard
              fromToken={fromToken}
              toToken={toToken}
              amount={amount}
              quote={quote}
              isLoading={isLoading}
              isTyping={isTyping}
              isConnected={!!address}
              isSupportedChain={isSupportedChain}
              tick={tick}
              onAmountChange={setAmount}
              onSwap={handleSwap}
              onSwapTokens={handleSwapTokens}
              onApprove={handleApprove}
              availableTokens={availableTokens}
              onFromTokenSelect={handleFromTokenSelect}
              onToTokenSelect={handleToTokenSelect}
            />

            <DesktopSwapErrorMessage
              error={currentError as any}
              isConnected={!!address}
              isSupportedChain={isSupportedChain}
            />

            {/* KYC Warning - shows only for KUB chain wrapped → native (unwrapping) */}
            {currentChain === 'kub' && 
             fromTokenConfig.symbol === 'KKUB' && 
             toTokenConfig.symbol === 'KUB' && (
              <DesktopKYCWarning />
            )}
          </SwapCardContainer>
        </SwapCentered>

        <DesktopSwapFooter />

        <DesktopSwapTransactionModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSwapComplete={handleSwapComplete}
          fromToken={fromTokenConfig}
          toToken={toTokenConfig}
          amountIn={amount}
          amountOut={quote?.amountOut || '0'}
          minimumReceived={quote?.minimumReceived || '0'}
          fee={10000} // 1% fee tier
          slippage={5}
        />
      </MainContent>
    </SwapContainer>
  );
};
