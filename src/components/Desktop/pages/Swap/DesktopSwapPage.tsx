"use client";

import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { useConnection } from 'wagmi';
import { DesktopSwapHeader } from './components/DesktopSwapHeader';
import { DesktopSwapCard } from './components/DesktopSwapCard';
import { DesktopSwapErrorMessage } from './components/DesktopSwapErrorMessage';
import { useDEXQuote } from '@/hooks/useDEXQuote';
import { useDEXSwap } from '@/hooks/useDEXSwap';
import { KUB_DEX_CONTRACTS } from '@/hooks/useDEXQuote';

const SwapContainer = styled.div`
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
`;

const MainContent = styled.main`
  width: 100%;
  max-width: 480px;
`;

export const DesktopSwap = () => {
  const { address } = useConnection();
  const { getQuote, isLoading: isQuoteLoading, error: quoteError, isSupportedChain } = useDEXQuote();
  const { executeSwapWithApproval, isLoading: isSwapLoading, error: swapError } = useDEXSwap();

  const [fromToken, setFromToken] = useState<string>(KUB_DEX_CONTRACTS.KLAW);
  const [toToken, setToToken] = useState<string>(KUB_DEX_CONTRACTS.KKUB);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState('');

  // Auto-get quote when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && isSupportedChain) {
      const fetchQuote = async () => {
        try {
          const quoteResult = await getQuote({
            tokenIn: fromToken,
            tokenOut: toToken,
            amountIn: amount,
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
  }, [amount, fromToken, toToken, getQuote, isSupportedChain]);

  const handleSwap = async () => {
    if (!quote || !address) return;

    try {
      await executeSwapWithApproval({
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: amount,
        amountOutMin: quote.minimumReceived,
        slippage: 5
      });
      
      // Reset form on success
      setAmount('');
      setQuote(null);
      setError('');
    } catch (err: any) {
      setError(err.message);
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

  return (
    <SwapContainer>
      <MainContent>
        <DesktopSwapHeader />
        
        <DesktopSwapCard
          fromToken={fromToken}
          toToken={toToken}
          amount={amount}
          quote={quote}
          isLoading={isLoading}
          isConnected={!!address}
          isSupportedChain={isSupportedChain}
          onAmountChange={setAmount}
          onSwap={handleSwap}
          onSwapTokens={handleSwapTokens}
        />

        <DesktopSwapErrorMessage
          error={currentError as any}
          isConnected={!!address}
          isSupportedChain={isSupportedChain}
        />
      </MainContent>
    </SwapContainer>
  );
};