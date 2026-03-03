import { useState, useCallback } from 'react';
import { useConnection, useChainId } from 'wagmi';
import { kubChain, kaia } from '@/wagmi_config';
import { parseUnits, formatUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { CHAIN_CONTRACTS, CHAIN_CONFIGS, CHAIN_DEX_TOKENS, ChainId } from '@/utils/chainConfig';
import { useAuth } from '@/contexts/ChainContext';
import { useWalletAccountStore } from '@/components/Wallet/Account/auth.hooks';

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

export const useDEXQuoteV2 = () => {
  const { account : address } = useWalletAccountStore();
  const chainId = useChainId();
  const { selectedAuthMethod } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine current chain and its configuration
  const getCurrentChain = (): { chain: ChainId; config: typeof CHAIN_CONFIGS[ChainId]; contracts: any; tokens: any } | null => {
    // For LINE SDK, always use KAIA
    if (selectedAuthMethod === 'line_sdk') {
      return {
        chain: 'kaia',
        config: CHAIN_CONFIGS.kaia,
        contracts: CHAIN_CONTRACTS.kaia,
        tokens: CHAIN_DEX_TOKENS.kaia
      };
    }

    // For Web3 wallet, use current chain
    if (chainId === kubChain.id) {
      return {
        chain: 'kub',
        config: CHAIN_CONFIGS.kub,
        contracts: CHAIN_CONTRACTS.kub,
        tokens: CHAIN_DEX_TOKENS.kub
      };
    }

    if (chainId === 8217) { // KAIA chain ID
      return {
        chain: 'kaia',
        config: CHAIN_CONFIGS.kaia,
        contracts: CHAIN_CONTRACTS.kaia,
        tokens: CHAIN_DEX_TOKENS.kaia
      };
    }

    return null;
  };

  const currentChain = getCurrentChain();
  const isSupportedChain = currentChain !== null;

  // Get viem chain object for public client
  const getViemChain = () => {
    if (!currentChain) return null;
    
    if (currentChain.chain === 'kub') {
      return kubChain;
    }
    
    if (currentChain.chain === 'kaia') {
      return kaia;
    }

    return null;
  };

  // Get quote from QuoterV2
  const getQuote = useCallback(async (params: QuoteParams): Promise<QuoteResult> => {
    if (!address || !currentChain) {
      throw new Error('Wallet not connected or chain not supported');
    }

    const { contracts, tokens } = currentChain;
    const viemChain = getViemChain();
    
    if (!viemChain) {
      throw new Error('Chain configuration not found');
    }

    // Get native and wrapped token addresses for current chain
    const nativeToken = tokens.find((t: any) => t.isNative);
    const wrappedToken = tokens.find((t: any) => !t.isNative && t.symbol !== 'KLAW');

    if (!nativeToken || !wrappedToken) {
      throw new Error('Token configuration not found');
    }

    // Convert native tokens to wrapped tokens for QuoterV2 (QuoterV2 doesn't handle native tokens)
    const tokenInForQuote = params.tokenIn === nativeToken.address ? wrappedToken.address : params.tokenIn;
    const tokenOutForQuote = params.tokenOut === nativeToken.address ? wrappedToken.address : params.tokenOut;

    // Validate tokens - check if they're supported on this chain
    const supportedTokens = tokens.map((t: any) => t.address);
    if (!supportedTokens.includes(params.tokenIn) || !supportedTokens.includes(params.tokenOut)) {
      throw new Error('Unsupported token for current chain');
    }

    // Handle native ↔ wrapped token swaps (wrap/unwrap) - return 1:1 quote
    if ((params.tokenIn === nativeToken.address && params.tokenOut === wrappedToken.address) ||
        (params.tokenIn === wrappedToken.address && params.tokenOut === nativeToken.address)) {
      return {
        amountOut: params.amountIn,
        priceImpact: 0,
        gasEstimate: '50000', // Lower gas for simple wrap/unwrap
        exchangeRate: '1.0',
        minimumReceived: params.amountIn, // No slippage for wrap/unwrap
        isLoading: false,
        error: undefined
      };
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
        chain: viemChain,
        transport: http(),
      });

      // For simplicity, assuming both tokens have 18 decimals
      const amountInWei = parseUnits(params.amountIn, 18);
      const slippagePercent = params.slippage || 5; // Default 5% slippage
      const feeUnits = 10000; // 1% fee tier

      // Get quote from QuoterV2 (using converted addresses for native tokens)
      const quoteResult = await publicClient.readContract({
        address: contracts.QuoterV2 as `0x${string}`,
        abi: quoterV2Abi,
        functionName: 'quoteExactInputSingle',
        args: [{
          tokenIn: tokenInForQuote as `0x${string}`,
          tokenOut: tokenOutForQuote as `0x${string}`,
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
  }, [address, currentChain]);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    getQuote,
    isLoading,
    error,
    resetError,
    isSupportedChain,
    currentChain: currentChain?.chain || null,
    availableTokens: currentChain?.tokens || []
  };
};

export default useDEXQuoteV2;