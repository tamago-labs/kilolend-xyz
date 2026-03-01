import { useState, useCallback } from 'react';
import { useConnection, useChainId } from 'wagmi';
import { kubChain } from '@/wagmi_config';
import { parseUnits, formatUnits } from 'viem';
import { createPublicClient, http } from 'viem';

// QuoterV2 ABI for getting swap quotes
const quoterV2Abi = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'feeUnits', type: 'uint24' },
          { name: 'limitSqrtP', type: 'uint160' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      {
        components: [
          { name: 'usedAmount', type: 'uint256' },
          { name: 'returnedAmount', type: 'uint256' },
          { name: 'afterSqrtP', type: 'uint160' },
          { name: 'initializedTicksCrossed', type: 'uint32' },
          { name: 'gasEstimate', type: 'uint256' }
        ],
        name: 'output',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// KUB DEX Contract Addresses
export const KUB_DEX_CONTRACTS = {
  QuoterV2: '0xc2E717DaB7DCaCcf1A463BB6ba66903BC41a7E1e' as const,
  Router: '0x5570c281c8F51905Edb78AC65E11b3c236F68F7b' as const,
  KLAW: '0xa83a9e9B63D48551F56179a92A2Ccf7984B167ff' as const,
  KKUB: '0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5' as const,
} as const;

export interface QuoteParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippage?: number; // Default 5%
}

export interface QuoteResult {
  amountOut: string;
  priceImpact: number;
  gasEstimate: string;
  exchangeRate: string;
  minimumReceived: string;
  isLoading: boolean;
  error?: string;
}

export const useDEXQuote = () => {
  const { address } = useConnection();
  const chainId = useChainId();
  const isKUBChain = chainId === kubChain.id;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get quote from QuoterV2
  const getQuote = useCallback(async (params: QuoteParams): Promise<QuoteResult> => {
    if (!address || !isKUBChain) {
      throw new Error('Wallet not connected or not on KUB chain');
    }

    // Validate tokens - only support KLAW <> KKUB pair
    const supportedTokens = [KUB_DEX_CONTRACTS.KLAW, KUB_DEX_CONTRACTS.KKUB];
    if (!supportedTokens.includes(params.tokenIn as any) || 
        !supportedTokens.includes(params.tokenOut as any)) {
      throw new Error('Only KLAW <> KKUB swaps are supported');
    }

    // Validate amount
    if (!params.amountIn || parseFloat(params.amountIn) <= 0) {
      throw new Error('Invalid amount');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create public client for direct contract call
      const publicClient = createPublicClient({
        chain: kubChain,
        transport: http(),
      });

      // For simplicity, assuming both tokens have 18 decimals
      const amountInWei = parseUnits(params.amountIn, 18);
      const slippagePercent = params.slippage || 5; // Default 5% slippage
      const feeUnits = 10000; // 1% fee tier

      // Get quote from QuoterV2
      const quoteResult = await publicClient.readContract({
        address: KUB_DEX_CONTRACTS.QuoterV2 as `0x${string}`,
        abi: quoterV2Abi,
        functionName: 'quoteExactInputSingle',
        args: [{
          tokenIn: params.tokenIn as `0x${string}`,
          tokenOut: params.tokenOut as `0x${string}`,
          amountIn: amountInWei,
          feeUnits: feeUnits,
          limitSqrtP: BigInt(0) // No price limit as BigInt
        }],
      });

      if (!quoteResult) {
        throw new Error('Failed to get quote');
      }

      // Based on the interface, quoteResult returns QuoteOutput struct:
      // { usedAmount, returnedAmount, afterSqrtP, initializedTicksCrossed, gasEstimate }
      const quoteData = quoteResult as {
        usedAmount: bigint;
        returnedAmount: bigint;
        afterSqrtP: bigint;
        initializedTicksCrossed: number;
        gasEstimate: bigint;
      };
      
      const { returnedAmount: amountOut, gasEstimate } = quoteData;
      
      // Format output amount
      const amountOutFormatted = formatUnits(amountOut, 18);
      
      // Calculate minimum received with slippage
      const slippageMultiplier = (100 - slippagePercent) / 100;
      const minimumReceived = (parseFloat(amountOutFormatted) * slippageMultiplier).toString();
      
      // Calculate exchange rate
      const exchangeRate = (parseFloat(amountOutFormatted) / parseFloat(params.amountIn)).toString();
      
      // For price impact, we'd need more complex calculation with pool reserves
      // For now, using a simple approximation
      const priceImpact = 0.1; // Placeholder - would need pool data for accurate calculation

      return {
        amountOut: amountOutFormatted,
        priceImpact,
        gasEstimate: gasEstimate.toString(),
        exchangeRate,
        minimumReceived,
        isLoading: false,
        error: undefined
      };

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get quote';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, isKUBChain]);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    getQuote,
    isLoading,
    error,
    resetError,
    isSupportedChain: isKUBChain,
  };
};

export default useDEXQuote;