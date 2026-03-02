"use client";

import styled from 'styled-components';
import { useState, useEffect, useCallback } from 'react';
import { useConnection } from 'wagmi';
import { DesktopSwapHeader } from './components/DesktopSwapHeader';
import { DesktopSwapStats } from './components/DesktopSwapStats';
import { DesktopSwapCard } from './components/DesktopSwapCard';
import { DesktopSwapFooter } from './components/DesktopSwapFooter';
import { DesktopSwapErrorMessage } from './components/DesktopSwapErrorMessage';
import { DesktopSwapTransactionModalWrapper } from './components/DesktopSwapTransactionModalWrapper';
import { DesktopKYCWarning } from './components/DesktopKYCWarning';
import { useDEXQuote } from '@/hooks/useDEXQuote';
import { useDEXSwap } from '@/hooks/useDEXSwap';
import { useDebounce } from '@/hooks/useDebounce';
import { KUB_DEX_CONTRACTS } from '@/hooks/useDEXQuote';
import { KUB_TOKENS } from '@/config/tokens';

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
  const { getQuote, isLoading: isQuoteLoading, error: quoteError, isSupportedChain } = useDEXQuote();
  const { approveToken, isLoading: isSwapLoading, error: swapError } = useDEXSwap();

  const [fromToken, setFromToken] = useState<string>(KUB_DEX_CONTRACTS.KUB);
  const [toToken, setToToken] = useState<string>(KUB_DEX_CONTRACTS.KLAW);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tick, setTick] = useState(1)

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

  // Auto-get quote when debounced amount changes
  useEffect(() => {
    if (debouncedAmount && parseFloat(debouncedAmount) > 0 && isSupportedChain) {
      const fetchQuote = async () => {
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
      };
      fetchQuote();
    } else {
      setQuote(null);
    }
  }, [debouncedAmount, fromToken, toToken, getQuote, isSupportedChain]);

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
    // setIsModalOpen(false);
    setError('');
    setTick(tick + 1)
  }, [tick])

  const handleApprove = async () => {
    if (!address) return;

    try {
      setIsProcessing(true);
      await approveToken(fromToken, KUB_DEX_CONTRACTS.Router, amount);
      // Approval successful - you can now proceed with swap
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
    setQuote(null);
  };

  const isLoading = isQuoteLoading || isSwapLoading;
  const currentError = error || quoteError || swapError;

  // Get token configurations
  // Available tokens for selection
  const availableTokens = [
    { symbol: 'KUB', name: 'KUB', address: KUB_DEX_CONTRACTS.KUB, isNative: true },
    { symbol: 'KKUB', name: 'Wrapped KUB', address: KUB_DEX_CONTRACTS.KKUB, isNative: false },
    { symbol: 'KLAW', name: 'KlawSter', address: KUB_DEX_CONTRACTS.KLAW, isNative: false }
  ];

  const getTokenConfig = (tokenAddress: string) => {
    if (tokenAddress === KUB_DEX_CONTRACTS.KUB) {
      return { symbol: 'KUB', address: tokenAddress, isNative: true };
    } else if (tokenAddress === KUB_DEX_CONTRACTS.KKUB) {
      return { symbol: 'KKUB', address: tokenAddress, isNative: false };
    } else if (tokenAddress === KUB_DEX_CONTRACTS.KLAW) {
      return { symbol: 'KLAW', address: tokenAddress, isNative: false };
    }
    return { symbol: 'UNKNOWN', address: tokenAddress, isNative: false };
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

        {/*<DesktopSwapStats />*/}

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

            {/* KYC Warning - shows only for KKUB → KUB (unwrapping) */}
            {fromToken === KUB_DEX_CONTRACTS.KKUB && toToken === KUB_DEX_CONTRACTS.KUB && (
              <DesktopKYCWarning />
            )}
          </SwapCardContainer>
        </SwapCentered>

        <DesktopSwapFooter />

        <DesktopSwapTransactionModalWrapper
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