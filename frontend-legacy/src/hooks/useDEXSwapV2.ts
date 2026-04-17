import { useMemo, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { kaia, kubChain } from '@/wagmi_config';
import { useDEXSwapWeb3 } from './useDEXSwapWeb3';
import { useDEXSwapLineSDK } from './useDEXSwapLineSDK';
import { useAuth } from '@/contexts/ChainContext';

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
  slippage?: number; // Default 5%
}

export interface DEXSwapV2State {
  isLoading: boolean;
  error: string | null;
}

export interface DEXSwapV2Return {
  checkAllowance: (tokenAddress: string, spenderAddress: string) => Promise<string>;
  approveToken: (tokenAddress: string, spenderAddress: string, amount: string) => Promise<{ hash: string }>;
  executeSwap: (params: SwapParams) => Promise<{ hash: string; requiredApproval: boolean }>;
  executeSwapWithApproval: (params: SwapParams) => Promise<{ hash: string; requiredApproval: boolean }>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
  isSupportedChain: boolean;
  // Additional helpers
  authMethod?: 'line_sdk' | 'web3_wallet' | null;
  useLineSDK?: boolean;
}

/**
 * Unified DEX swap hook that routes to appropriate implementation based on auth method
 */
export const useDEXSwapV2 = (): DEXSwapV2Return => {
  const { selectedAuthMethod } = useAuth();
  const chainId = useChainId();
  
  // Chain detection logic
  const isKAIAChain = chainId === kaia.id;
  const isKUBChain = chainId === kubChain.id;
  
  // Route to appropriate hook based on auth method
  const web3Swap = useDEXSwapWeb3();
  const lineSDKSwap = useDEXSwapLineSDK();
  
  // Determine which implementation to use
  const useLineSDK = selectedAuthMethod === 'line_sdk' && isKAIAChain;
  
  // Combine the states from both implementations
  const combinedState = useMemo(() => {
    if (useLineSDK) {
      return {
        isLoading: lineSDKSwap.isLoading,
        error: lineSDKSwap.error,
        isSupportedChain: lineSDKSwap.isSupportedChain,
      };
    } else {
      return {
        isLoading: web3Swap.isLoading,
        error: web3Swap.error,
        isSupportedChain: web3Swap.isSupportedChain,
      };
    }
  }, [useLineSDK, lineSDKSwap, web3Swap]);

  // Unified function that routes to the appropriate implementation
  const checkAllowance = useCallback(async (tokenAddress: string, spenderAddress: string): Promise<string> => {
    if (useLineSDK) {
      return await lineSDKSwap.checkAllowance(tokenAddress, spenderAddress);
    } else {
      return await web3Swap.checkAllowance(tokenAddress, spenderAddress);
    }
  }, [useLineSDK, lineSDKSwap, web3Swap]);

  const approveToken = useCallback(async (tokenAddress: string, spenderAddress: string, amount: string): Promise<{ hash: string }> => {
    if (useLineSDK) {
      return await lineSDKSwap.approveToken(tokenAddress, spenderAddress, amount);
    } else {
      return await web3Swap.approveToken(tokenAddress, spenderAddress, amount);
    }
  }, [useLineSDK, lineSDKSwap, web3Swap]);

  const executeSwap = useCallback(async (params: SwapParams): Promise<{ hash: string; requiredApproval: boolean }> => {
    if (useLineSDK) {
      return await lineSDKSwap.executeSwap(params);
    } else {
      return await web3Swap.executeSwap(params);
    }
  }, [useLineSDK, lineSDKSwap, web3Swap]);

  const executeSwapWithApproval = useCallback(async (params: SwapParams): Promise<{ hash: string; requiredApproval: boolean }> => {
    if (useLineSDK) {
      return await lineSDKSwap.executeSwapWithApproval(params);
    } else {
      return await web3Swap.executeSwapWithApproval(params);
    }
  }, [useLineSDK, lineSDKSwap, web3Swap]);

  const resetError = useCallback(() => {
    if (useLineSDK) {
      lineSDKSwap.resetError();
    } else {
      web3Swap.resetError();
    }
  }, [useLineSDK, lineSDKSwap, web3Swap]);

  return {
    checkAllowance,
    approveToken,
    executeSwap,
    executeSwapWithApproval,
    isLoading: combinedState.isLoading,
    error: combinedState.error,
    resetError,
    isSupportedChain: combinedState.isSupportedChain,
    // Additional helpers
    authMethod: selectedAuthMethod,
    useLineSDK,
  };
};

export default useDEXSwapV2;