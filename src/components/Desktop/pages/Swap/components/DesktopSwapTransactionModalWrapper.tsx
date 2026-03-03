"use client";

import React from 'react';
import { DesktopBaseModal } from '@/components/Desktop/modals/shared/DesktopBaseModal';
import { DesktopSwapTransactionModal } from './DesktopSwapTransactionModal';
import { SwapModalErrorBoundary } from './SwapModalErrorBoundary';

interface DesktopSwapTransactionModalWrapperProps {
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

export const DesktopSwapTransactionModalWrapper: React.FC<DesktopSwapTransactionModalWrapperProps> = (props) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Handle errors at the wrapper level
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Swap modal wrapper caught error:', error, errorInfo);
    setHasError(true);
    setError(error);
    
    // Log to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  };

  const handleReset = () => {
    setHasError(false);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    props.onClose();
  };

  // If there's an error, show an error modal instead of the regular modal
  if (hasError && error) {
    return (
      <DesktopBaseModal 
        isOpen={props.isOpen} 
        onClose={handleClose} 
        title="Transaction Error"
      >
        <div style={{
          padding: '32px',
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          margin: '16px 0',
          maxWidth: '480px',
          width: '100%'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#dc2626',
            marginBottom: '16px'
          }}>
            ⚠️ Transaction Error
          </div>
          <div style={{
            fontSize: '14px',
            color: '#7f1d1d',
            marginBottom: '16px',
            lineHeight: '1.5'
          }}>
            An error occurred while processing your swap. This could be due to network issues, insufficient balance, or contract restrictions.
          </div>
          {error.message && (
            <div style={{
              fontSize: '12px',
              color: '#991b1b',
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              borderRadius: '6px',
              fontFamily: 'monospace',
              wordBreak: 'break-word'
            }}>
              {error.message}
            </div>
          )}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <button
              onClick={handleReset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close Modal
            </button>
          </div>
        </div>
      </DesktopBaseModal>
    );
  }

  return (
    <SwapModalErrorBoundary
      onError={handleError}
    >
      <DesktopSwapTransactionModal {...props} />
    </SwapModalErrorBoundary>
  );
};

export default DesktopSwapTransactionModalWrapper;