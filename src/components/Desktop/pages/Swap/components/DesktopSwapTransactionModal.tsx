"use client";

import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { DesktopBaseModal } from '@/components/Desktop/modals/shared/DesktopBaseModal';

import { formatUSD } from '@/utils/formatters';
import { ExternalLink, Check, RotateCw } from 'react-feather';
import { useDEXSwap } from '@/hooks/useDEXSwap';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useTokenBalancesV2 } from '@/hooks/useTokenBalancesV2';

const ModalContent = styled.div`
  padding: 32px;
  max-width: 480px;
  width: 100%;
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 24px;
  text-align: center;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
`;

const Step = styled.div<{ $active?: boolean; $completed?: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $active, $completed }) =>
    $completed ? '#06C755' : $active ? '#06C755' : '#94a3b8'};
  font-weight: 600;
  font-size: 14px;
`;

const StepNumber = styled.div<{ $active?: boolean; $completed?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $active, $completed }) =>
    $completed ? '#06C755' : $active ? '#06C755' : '#e2e8f0'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-weight: 700;
`;

const StepConnector = styled.div<{ $completed?: boolean }>`
  width: 40px;
  height: 2px;
  background: ${({ $completed }) => $completed ? '#06C755' : '#e2e8f0'};
  margin: 0 8px;
`;

const PreviewSection = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
`;

const PreviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PreviewLabel = styled.div`
  font-size: 14px;
  color: #64748b;
`;

const PreviewValue = styled.div<{ $danger?: boolean }>`
  font-size: 16px;
  font-weight: 600;
  color: ${({ $danger }) => $danger ? '#dc2626' : '#1e293b'};
`;

const SwapIconContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 16px 0;
`;

const SwapIcon = styled.div`
  width: 40px;
  height: 40px;
  background: #06C755;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const WarningText = styled.div`
  font-size: 14px;
  color: #92400e;
  line-height: 1.5;
`;

const ActionButton = styled.button<{ $primary?: boolean; $disabled?: boolean }>`
  width: 100%;
  padding: 16px;
  margin-top: 24px;
  background: ${({ $primary, $disabled }) =>
    $disabled ? '#e2e8f0' : $primary ? '#06C755' : 'white'};
  color: ${({ $primary, $disabled }) =>
    $disabled ? '#94a3b8' : $primary ? 'white' : '#06C755'};
  border: 1px solid ${({ $disabled }) => $disabled ? '#e2e8f0' : '#06C755'};
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s;
  margin-bottom: 12px;

  &:hover {
    background: ${({ $primary, $disabled }) =>
    $disabled ? '#e2e8f0' : $primary ? '#059669' : '#06C755'};
    color: ${({ $disabled }) => $disabled ? '#94a3b8' : 'white'};
  }
`;

const CancelButton = styled.button`
  width: 100%;
  padding: 16px;
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #f8fafc;
  }
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #06C755;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #22c55e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px auto;
  color: white;
`;

const SuccessMessage = styled.div`
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
`;

const SuccessSubtext = styled.div`
  text-align: center;
  font-size: 16px;
  color: #64748b;
  margin-bottom: 32px;
  line-height: 1.5;
`;

const TransactionDetails = styled.div`
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
  text-align: left;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  font-size: 14px;
  color: #166534;
`;

const DetailValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #166534;
`;

const ClickableTransactionHash = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #059669;
    text-decoration: underline;
  }
`;

const TokenDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TokenIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
`;

interface DesktopSwapTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwapComplete?: () => void;
  fromToken: {
    symbol: string;
    address: string;
  };
  toToken: {
    symbol: string;
    address: string;
  };
  amountIn: string;
  amountOut: string;
  minimumReceived: string;
  fee: number;
  slippage: number;
}

type TransactionStep = 'preview' | 'confirmation' | 'success';

interface TransactionResult {
  hash: string;
  status: 'confirmed' | 'pending' | 'failed';
}

export const DesktopSwapTransactionModal = ({
  isOpen,
  onClose,
  onSwapComplete,
  fromToken,
  toToken,
  amountIn,
  amountOut,
  minimumReceived,
  fee,
  slippage,
}: DesktopSwapTransactionModalProps) => {

  const { executeSwapWithApproval, isLoading: swapLoading, error: swapError } = useDEXSwap();
 
  const [currentStep, setCurrentStep] = useState<TransactionStep>('preview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [mainTxHash, setMainTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [transactionTimeout, setTransactionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Wait for main transaction receipt (swap)
  const { data: mainReceipt, isSuccess: isMainConfirmed, error: receiptError } = useWaitForTransactionReceipt({
    hash: mainTxHash,
    query: {
      enabled: !!mainTxHash,
      retry: false, // Don't retry automatically to avoid infinite loops on errors
    },
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('preview');
      setIsProcessing(false);
      setError(null);
      setTransactionResult(null);
      setMainTxHash(undefined);
      // Clear any existing timeout
      if (transactionTimeout) {
        clearTimeout(transactionTimeout);
        setTransactionTimeout(null);
      }
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transactionTimeout) {
        clearTimeout(transactionTimeout);
      }
    };
  }, [transactionTimeout]);

  // Parse error messages for better user experience
  const parseErrorMessage = (error: any): string => {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Transaction failed';
    
    // Handle specific KYC error
    if (errorMessage.includes('kyc address registered with phone number') || 
        errorMessage.includes('only kyc address')) {
      return 'KYC verification required. Please complete KYC verification to proceed with this transaction.';
    }
    
    // Handle insufficient balance
    if (errorMessage.includes('insufficient balance') || 
        errorMessage.includes('balance too low') ||
        errorMessage.includes('ERC20: transfer amount exceeds balance')) {
      return 'Insufficient balance. Please ensure you have enough tokens for this swap.';
    }
    
    // Handle slippage protection
    if (errorMessage.includes('slippage') || 
        errorMessage.includes('too little received') ||
        errorMessage.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
      return 'Transaction failed due to slippage protection. Try increasing your slippage tolerance or wait for better market conditions.';
    }
    
    // Handle gas/fee issues
    if (errorMessage.includes('gas') || 
        errorMessage.includes('fee') ||
        errorMessage.includes('INtrinsic gas too low')) {
      return 'Transaction failed due to gas fee issues. Please try again with higher gas settings.';
    }
    
    // Handle network issues
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return 'Network error occurred. Please check your connection and try again.';
    }
    
    // Handle rejection
    if (errorMessage.includes('rejected') || 
        errorMessage.includes('denied') ||
        errorMessage.includes('cancelled')) {
      return 'Transaction was cancelled by user.';
    }
    
    // Return original message if no specific pattern matches
    return errorMessage;
  };

  // Handle swap errors from hook
  useEffect(() => {
    if (swapError) {
      setError(parseErrorMessage(swapError));
      setIsProcessing(false);
    }
  }, [swapError]);

  // Handle transaction receipt errors
  useEffect(() => {
    if (receiptError) {
      setError(parseErrorMessage(receiptError));
      setIsProcessing(false);
    }
  }, [receiptError]);

  // Handle main transaction confirmation
  useEffect(() => {
    if (isMainConfirmed && mainReceipt && mainTxHash) {
      console.log('Main transaction confirmed:', mainReceipt);
      
      // Clear the timeout since transaction was confirmed
      if (transactionTimeout) {
        clearTimeout(transactionTimeout);
        setTransactionTimeout(null);
      }
      
      setTransactionResult({
        hash: mainTxHash,
        status: 'confirmed'
      });
      setIsProcessing(false);
      setCurrentStep('success');
      onSwapComplete?.();
    }
  }, [isMainConfirmed, mainReceipt, mainTxHash, transactionTimeout]);

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePreviewAction = async () => {
    // Prevent multiple simultaneous transactions
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    setCurrentStep('confirmation');

    // Execute the swap with comprehensive error handling
    try {
      // Validate input parameters first to catch synchronous errors
      if (!fromToken?.address || !toToken?.address) {
        throw new Error('Invalid token addresses');
      }
      
      if (!amountIn || parseFloat(amountIn) <= 0) {
        throw new Error('Invalid amount');
      }

      const result = await executeSwapWithApproval({
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        amountIn: amountIn,
        amountOutMin: minimumReceived,
        slippage: slippage
      });

      // Set transaction hash for real monitoring
      if (result.hash) {
        setMainTxHash(result.hash as `0x${string}`);
        console.log('Swap transaction sent, hash:', result.hash);
        console.log('Required approval:', result.requiredApproval);
        
        // Set a timeout for transaction confirmation (5 minutes)
        const timeout = setTimeout(() => {
          setError('Transaction is taking longer than expected. It may still complete, but you can check the transaction hash for status updates.');
          setIsProcessing(false);
        }, 5 * 60 * 1000); // 5 minutes
        
        setTransactionTimeout(timeout);
        // Keep isProcessing true until confirmation
        // The useEffect will handle confirmation and set success
      } else {
        throw new Error('Transaction failed: No transaction hash received');
      }
    } catch (err: any) {
      console.error('Swap execution error:', err);
      const parsedError = parseErrorMessage(err);
      setError(parsedError);
      setIsProcessing(false);
      setCurrentStep('confirmation'); // Keep user in confirmation step to see error
    }
  };

  // Reset transaction state and go back to preview
  const handleTryAgain = () => {
    setError(null);
    setTransactionResult(null);
    setMainTxHash(undefined);
    setCurrentStep('preview');
    setIsProcessing(false);
  };
 
 

  const renderStepIndicator = () => {
    const steps = [
      { key: 'preview', label: 'Preview' },
      { key: 'confirmation', label: 'Confirm' },
      { key: 'success', label: 'Complete' }
    ];

    return (
      <StepIndicator>
        {steps.map((step, index) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <Step $active={currentStep === step.key} $completed={currentStep === 'success'}>
              <StepNumber $active={currentStep === step.key} $completed={currentStep === 'success'}>
                {currentStep === 'success' ? '✓' : index + 1}
              </StepNumber>
              {step.label}
            </Step>
            {index < steps.length - 1 && (
              <StepConnector $completed={currentStep === 'success'} />
            )}
          </div>
        ))}
      </StepIndicator>
    );
  };

  const renderPreview = () => {
    return (
      <>
        <PreviewSection>
          <PreviewRow>
            <PreviewLabel>You Sell</PreviewLabel>
            <TokenDisplay> 
              <PreviewValue>{amountIn} {fromToken.symbol}</PreviewValue>
            </TokenDisplay>
          </PreviewRow> 

          <PreviewRow>
            <PreviewLabel>You Buy (Est.)</PreviewLabel>
            <TokenDisplay> 
              <PreviewValue>{amountOut} {toToken.symbol}</PreviewValue>
            </TokenDisplay>
          </PreviewRow>

          {/*<PreviewRow>
            <PreviewLabel>Minimum Received</PreviewLabel>
            <PreviewValue>{minimumReceived} {toToken.symbol}</PreviewValue>
          </PreviewRow>*/}

          <PreviewRow>
            <PreviewLabel>Fee</PreviewLabel>
            <PreviewValue>{(fee / 10000).toFixed(2)}%</PreviewValue>
          </PreviewRow>

          <PreviewRow>
            <PreviewLabel>Slippage Tolerance</PreviewLabel>
            <PreviewValue>{slippage}%</PreviewValue>
          </PreviewRow>
        </PreviewSection>
 

        <ActionButton
          $primary
          $disabled={isProcessing}
          onClick={handlePreviewAction}
        >
          {isProcessing && <LoadingSpinner />}
          {isProcessing ? 'Processing...' : 'Confirm Swap'}
        </ActionButton>

        <CancelButton onClick={onClose} disabled={isProcessing}>
          Cancel
        </CancelButton>
      </>
    );
  };

  const renderConfirmation = () => (
    <>
      <PreviewSection>
        <PreviewRow>
          <PreviewLabel>Transaction</PreviewLabel>
          <PreviewValue>Swapping {amountIn} {fromToken.symbol} → {toToken.symbol}</PreviewValue>
        </PreviewRow>
        <PreviewRow>
          <PreviewLabel>Status</PreviewLabel>
          <PreviewValue>
            {isProcessing ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <LoadingSpinner />
                Awaiting Confirmation...
              </div>
            ) : error ? (
              <span style={{ color: '#ef4444' }}>Failed</span>
            ) : transactionResult?.status === 'confirmed' ? (
              <span style={{ color: '#06C755' }}>Confirmed</span>
            ) : (
              <span style={{ color: '#64748b' }}>Ready</span>
            )}
          </PreviewValue>
        </PreviewRow>
      </PreviewSection>

      {error && (
        <WarningBox>
          <WarningText>
            ❌ {error}
          </WarningText>
        </WarningBox>
      )}

      {!isProcessing && !transactionResult && (
        <ActionButton onClick={() => setCurrentStep('preview')}>
          Back to Preview
        </ActionButton>
      )}

      {error && (
        <ActionButton onClick={handleTryAgain}>
          Try Again
        </ActionButton>
      )}
    </>
  );

  const renderSuccess = () => (
    <>
      <SuccessIcon>
        <Check size={40} />
      </SuccessIcon>
      <SuccessMessage>Swap Successful!</SuccessMessage>
      <SuccessSubtext>
        You have successfully swapped {amountIn} {fromToken.symbol}
      </SuccessSubtext>

      <TransactionDetails>
        {/*<DetailRow>
          <DetailLabel>From</DetailLabel>
          <DetailValue>{amountIn} {fromToken.symbol}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>To</DetailLabel>
          <DetailValue>{amountOut} {toToken.symbol}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>Fee</DetailLabel>
          <DetailValue>{(fee / 10000).toFixed(2)}%</DetailValue>
        </DetailRow>*/}
        <DetailRow>
          <DetailLabel>Status</DetailLabel>
          <DetailValue>Confirmed</DetailValue>
        </DetailRow>
        {transactionResult?.hash && (
          <DetailRow>
            <DetailLabel>Transaction</DetailLabel>
            <ClickableTransactionHash onClick={() => handleExternalLink(`https://kubscan.com/tx/${transactionResult.hash}`)}>
              <DetailValue>{`${transactionResult.hash.slice(0, 6)}...${transactionResult.hash.slice(-4)}`}</DetailValue>
              <ExternalLink size={12} />
            </ClickableTransactionHash>
          </DetailRow>
        )}
      </TransactionDetails>

      <ActionButton $primary onClick={onClose}>
        Close
      </ActionButton>
    </>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 'preview':
        return renderPreview();
      case 'confirmation':
        return renderConfirmation();
      case 'success':
        return renderSuccess();
      default:
        return renderPreview();
    }
  };

  return (
    <DesktopBaseModal isOpen={isOpen} onClose={onClose} title={`Swap ${fromToken.symbol} → ${toToken.symbol}`}>
      <ModalContent>
        {renderStepIndicator()}
        {renderContent()}
      </ModalContent>
    </DesktopBaseModal>
  );
};

// Expose a method to update transaction state from parent
export type SwapTransactionModalRef = {
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  setTransactionResult: (result: TransactionResult | null) => void;
  moveToConfirmation: () => void;
};