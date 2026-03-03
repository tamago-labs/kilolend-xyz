import { useState, useCallback } from 'react';
import { useWriteContract, useChainId, useConnection, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CHAIN_CONTRACTS, CHAIN_DEX_TOKENS, ChainId } from '@/utils/chainConfig';
import { createPublicClient, http } from 'viem';
import { kaia, kubChain } from '@/wagmi_config';
import { Abi, encodeFunctionData } from 'viem';

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
  slippage?: number; // Default 5%
}

export interface DEXSwapWeb3State {
  isLoading: boolean;
  error: string | null;
}

export interface DEXSwapWeb3Return {
  checkAllowance: (tokenAddress: string, spenderAddress: string) => Promise<string>;
  approveToken: (tokenAddress: string, spenderAddress: string, amount: string) => Promise<{ hash: string }>;
  executeSwap: (params: SwapParams) => Promise<{ hash: string; requiredApproval: boolean }>;
  executeSwapWithApproval: (params: SwapParams) => Promise<{ hash: string; requiredApproval: boolean }>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
  isSupportedChain: boolean;
}

// ERC-20 ABI for approval
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Wrapped token ABI for wrap/unwrap operations
const WRAPPED_TOKEN_ABI = [
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// Router ABI for DEX swaps (matching V1 exactly)
const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'limitSqrtP', type: 'uint160' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'swapExactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    type: "function",
    name: "multicall",
    inputs: [
      {
        name: "data",
        type: "bytes[]",
        internalType: "bytes[]"
      }
    ],
    outputs: [
      {
        name: "results",
        type: "bytes[]",
        internalType: "bytes[]"
      }
    ],
    stateMutability: "payable"
  },
  {
    inputs: [
      { name: 'minAmount', type: 'uint256' },
      { name: 'recipient', type: 'address' }
    ],
    name: 'unwrapWeth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'refundEth',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
];

export const useDEXSwapWeb3 = (): DEXSwapWeb3Return => {
  const { address } = useConnection();
  const chainId = useChainId();
  const writeContract = useWriteContract();

  const [state, setState] = useState<DEXSwapWeb3State>({
    isLoading: false,
    error: null,
  });

  const updateState = useCallback((updates: Partial<DEXSwapWeb3State>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Get current chain configuration
   */
  const getCurrentChain = useCallback(() => {
    if (chainId === 8217) {
      return {
        chainId: 'kaia' as ChainId,
        contracts: CHAIN_CONTRACTS.kaia,
        tokens: CHAIN_DEX_TOKENS.kaia
      };
    } else if (chainId === 96) {
      return {
        chainId: 'kub' as ChainId,
        contracts: CHAIN_CONTRACTS.kub,
        tokens: CHAIN_DEX_TOKENS.kub
      };
    }
    return null;
  }, [chainId]);

  /**
   * Check if current chain is supported
   */
  const isSupportedChain = !!getCurrentChain();

  /**
   * Check token allowance
   */
  const checkAllowance = useCallback(async (
    tokenAddress: string,
    spenderAddress: string
  ): Promise<string> => {
    if (!address || !isSupportedChain) {
      throw new Error('Wallet not connected or unsupported chain');
    }

    const chainConfig = getCurrentChain();
    if (!chainConfig) {
      throw new Error('Unsupported chain');
    }

    try {

      const chainId = chainConfig.chainId === "kub" ? kubChain : kaia

      const publicClient = createPublicClient({
        chain: chainId,
        transport: http(),
      });

      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, spenderAddress as `0x${string}`],
      });

      if (!allowance) {
        return '0';
      }

      return formatUnits(allowance as bigint, 18);

    } catch (error) {
      console.error('Error checking allowance:', error);
      return '0';
    }
  }, [address, isSupportedChain, getCurrentChain, chainId]);

  /**
   * Approve token for spending
   */
  const approveToken = useCallback(async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<{ hash: string }> => {
    if (!address || !isSupportedChain) {
      throw new Error('Wallet not connected or unsupported chain');
    }

    const chainConfig = getCurrentChain();
    if (!chainConfig) {
      throw new Error('Unsupported chain');
    }

    updateState({ isLoading: true, error: null });

    try {
      const approveAmount = parseUnits('999999999', 18);

      const hash = await writeContract.mutateAsync({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, approveAmount]
      });

      updateState({ isLoading: false });
      return { hash: (hash as any) as string };
    } catch (error: any) {
      console.error('Error approving token:', error);
      const errorMessage = error.message || 'Approval failed';

      updateState({
        isLoading: false,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  }, [address, isSupportedChain, getCurrentChain, writeContract, updateState]);

  /**
   * Execute swap
   */
  const executeSwap = useCallback(async (params: SwapParams): Promise<{ hash: string; requiredApproval: boolean }> => {
    if (!address || !isSupportedChain) {
      throw new Error('Wallet not connected or unsupported chain');
    }

    const chainConfig = getCurrentChain();
    if (!chainConfig) {
      throw new Error('Unsupported chain');
    }

    updateState({ isLoading: true, error: null });

    try {
      const { tokenIn, tokenOut, amountIn, amountOutMin } = params;
      const amountInWei = parseUnits(amountIn, 18);
      const amountOutMinWei = parseUnits(amountOutMin, 18);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
      const fee = BigInt(10000); // 1% fee tier

      // Handle native ↔ wrapped token swaps
      const isNativeIn = tokenIn === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      const isNativeOut = tokenOut === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

      const wrappedToken = chainConfig.chainId === 'kaia'
        ? (chainConfig.contracts as any).WKAIA
        : (chainConfig.contracts as any).KKUB;

      let hash: string;

      if (isNativeIn && tokenOut === wrappedToken) {
        // Native → Wrapped (wrap)
        hash = await writeContract.mutateAsync({
          address: wrappedToken as `0x${string}`,
          abi: WRAPPED_TOKEN_ABI,
          functionName: 'deposit',
          value: amountInWei
        }) as string;
      } else if (tokenIn === wrappedToken && isNativeOut) {
        // Wrapped → Native (unwrap)
        hash = await writeContract.mutateAsync({
          address: wrappedToken as `0x${string}`,
          abi: WRAPPED_TOKEN_ABI,
          functionName: 'withdraw',
          args: [amountInWei]
        }) as string;
      } else {
        // Token swaps using Router with multicall (matching V1 logic)
        const tokenInForSwap = isNativeIn ? wrappedToken : tokenIn;
        const tokenOutForSwap = isNativeOut ? wrappedToken : tokenOut;
        const router = chainConfig.contracts.Router;

        const recipient = isNativeOut ? router : address;

        const swapParams = {
          tokenIn: tokenInForSwap as `0x${string}`,
          tokenOut: tokenOutForSwap as `0x${string}`,
          fee: Number(fee),
          recipient: recipient as `0x${string}`,
          deadline: deadline,
          amountIn: amountInWei,
          minAmountOut: amountOutMinWei,
          limitSqrtP: BigInt(0) // no price limit
        };

        // Build multicall data based on swap direction (matching V1)
        let multicallData: `0x${string}`[] = [];

        if (isNativeIn) {
          // Native → Token: Router auto-wraps, just swap
          multicallData = [
            encodeFunctionData({
              abi: ROUTER_ABI as Abi,
              functionName: 'swapExactInputSingle',
              args: [swapParams]
            })
          ];
        } else if (isNativeOut) {
          // Token → Native: Swap to wrapped then unwrap
          multicallData = [
            encodeFunctionData({
              abi: ROUTER_ABI as Abi,
              functionName: 'swapExactInputSingle',
              args: [swapParams]
            }),
            encodeFunctionData({
              abi: ROUTER_ABI as Abi,
              functionName: 'unwrapWeth',
              args: [0, address]
            })
          ];
        } else {
          // Token ↔ Token: Standard swap
          multicallData = [
            encodeFunctionData({
              abi: ROUTER_ABI as Abi,
              functionName: 'swapExactInputSingle',
              args: [swapParams]
            })
          ];
        }

        hash = await writeContract.mutateAsync({
          address: router as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: 'multicall',
          args: [multicallData],
          value: isNativeIn ? amountInWei : BigInt(0),
          chainId: chainConfig.chainId === 'kaia' ? 8217 : 96,
        }) as string;
      }

      updateState({ isLoading: false });

      return {
        hash,
        requiredApproval: false
      };
    } catch (error: any) {
      console.error('Error executing swap:', error);
      const errorMessage = error.message || 'Swap failed';

      updateState({
        isLoading: false,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  }, [address, isSupportedChain, getCurrentChain, writeContract, updateState]);

  /**
   * Execute swap with approval check
   */
  const executeSwapWithApproval = useCallback(async (params: SwapParams): Promise<{ hash: string; requiredApproval: boolean }> => {
    const chainConfig = getCurrentChain();
    if (!chainConfig) {
      throw new Error('Unsupported chain');
    }

    const routerAddress = chainConfig.contracts.Router;

    // Check if approval is needed (skip for native tokens)
    const isNativeIn = params.tokenIn === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const wrappedToken = chainConfig.chainId === 'kaia'
      ? (chainConfig.contracts as any).WKAIA
      : (chainConfig.contracts as any).KKUB;

    const isWrapUnwrap =
      (isNativeIn && params.tokenOut === wrappedToken) ||
      (params.tokenIn === wrappedToken && !isNativeIn);

    let requiredApproval = false;

    if (!isNativeIn && !isWrapUnwrap) {
      const currentAllowance = await checkAllowance(params.tokenIn, routerAddress);
      const amountInWei = parseUnits(params.amountIn, 18);
      const allowanceWei = parseUnits(currentAllowance, 18);

      if (allowanceWei < amountInWei) {
        // Approval needed
        await approveToken(params.tokenIn, routerAddress, params.amountIn);
        requiredApproval = true;
      }
    }

    // Execute swap
    const swapResult = await executeSwap(params);

    return { ...swapResult, requiredApproval };
  }, [getCurrentChain, checkAllowance, approveToken, executeSwap]);

  return {
    checkAllowance,
    approveToken,
    executeSwap,
    executeSwapWithApproval,
    isLoading: state.isLoading,
    error: state.error,
    resetError,
    isSupportedChain,
  };
};