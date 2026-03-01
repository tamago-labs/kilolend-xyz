import { useState, useCallback } from 'react';
import { useWriteContract, useConnection, useChainId } from 'wagmi';
import { kubChain } from '@/wagmi_config';
import { parseUnits, formatUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { KUB_DEX_CONTRACTS } from './useDEXQuote';

// ERC20 ABI for allowance and approval
const erc20Abi = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Router ABI for executing swaps
const routerAbi = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'recipient', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'limitSqrtP', type: 'uint160' }
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  }
] as const;

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
  slippage: number;
  deadline?: number;
}

export interface SwapResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export const useDEXSwap = () => {
  const { address } = useConnection();
  const chainId = useChainId();
  const isKUBChain = chainId === kubChain.id;
  const writeContract = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check token allowance
  const checkAllowance = useCallback(async (
    tokenAddress: string,
    spenderAddress: string
  ): Promise<string> => {
    if (!address || !isKUBChain) {
      throw new Error('Wallet not connected or not on KUB chain');
    }

    try {
      const publicClient = createPublicClient({
        chain: kubChain,
        transport: http(),
      });

      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, spenderAddress as `0x${string}`],
      });

      if (!allowance) {
        return '0';
      }

      return formatUnits(allowance as bigint, 18);
    } catch (err: any) {
      console.error('Error checking allowance:', err);
      return '0';
    }
  }, [address, chainId, isKUBChain]);

  // Approve token for spending
  const approveToken = useCallback(async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<{ hash: string }> => {
    if (!address || !isKUBChain) {
      throw new Error('Wallet not connected or not on KUB chain');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Approve maximum amount for convenience
      const approveAmount = parseUnits('999999999', 18);

      const hash = await writeContract.mutateAsync({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, approveAmount],
        chainId: kubChain.id,
      });

      return { hash };
    } catch (err: any) {
      const errorMessage = err.message || 'Approval failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, isKUBChain, writeContract]);

  // Execute swap
  const executeSwap = useCallback(async (params: SwapParams): Promise<{ hash: string }> => {
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
      const amountInWei = parseUnits(params.amountIn, 18);
      const amountOutMinWei = parseUnits(params.amountOutMin, 18);
      const deadline = params.deadline || Math.floor(Date.now() / 1000) + 1200; // 20 minutes default
      const fee = 10000; // 1% fee tier

      const hash = await writeContract.mutateAsync({
        address: KUB_DEX_CONTRACTS.Router as `0x${string}`,
        abi: routerAbi,
        functionName: 'exactInputSingle',
        args: [
          params.tokenIn as `0x${string}`,
          params.tokenOut as `0x${string}`,
          fee,
          address as `0x${string}`, // recipient
          BigInt(deadline),
          amountInWei,
          amountOutMinWei,
          BigInt(0) // limitSqrtP - no price limit
        ],
        chainId: kubChain.id,
      });

      return { hash };
    } catch (err: any) {
      const errorMessage = err.message || 'Swap failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, isKUBChain, writeContract]);

  // Complete swap flow with approval check
  const executeSwapWithApproval = useCallback(async (
    params: SwapParams
  ): Promise<{ hash: string; requiredApproval: boolean }> => {
    const routerAddress = KUB_DEX_CONTRACTS.Router;
    
    // Check if approval is needed
    console.log('Checking allowance for token:', params.tokenIn, 'to router:', routerAddress);
    const currentAllowance = await checkAllowance(params.tokenIn, routerAddress);
    console.log('Current allowance:', currentAllowance, 'Required amount:', params.amountIn);
    
    const amountInWei = parseUnits(params.amountIn, 18);
    const allowanceWei = parseUnits(currentAllowance, 18);
    
    let requiredApproval = false;
    if (allowanceWei < amountInWei) {
      console.log('Approval required - current allowance insufficient');
      // Approval needed
      const approvalResult = await approveToken(params.tokenIn, routerAddress, params.amountIn);
      requiredApproval = true;
      
      // Wait for approval to be confirmed using public client
      console.log('Waiting for approval confirmation:', approvalResult.hash);
      const publicClient = createPublicClient({
        chain: kubChain,
        transport: http(),
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: approvalResult.hash as `0x${string}`,
      });
      
      if (receipt.status === 'success') {
        console.log('Approval confirmed, re-checking allowance');
        // Wait a bit more for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Re-check allowance after approval confirmation
        const newAllowance = await checkAllowance(params.tokenIn, routerAddress);
        const newAllowanceWei = parseUnits(newAllowance, 18);
        
        if (newAllowanceWei < amountInWei) {
          throw new Error('Approval confirmed but allowance still insufficient. Please try again.');
        }
        console.log('New allowance after approval:', newAllowance);
      } else {
        throw new Error('Approval transaction failed');
      }
    } else {
      console.log('No approval needed - sufficient allowance exists');
    }
    
    // Execute swap
    const swapResult = await executeSwap(params);
    
    return { ...swapResult, requiredApproval };
  }, [checkAllowance, approveToken, executeSwap]);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    checkAllowance,
    approveToken,
    executeSwap,
    executeSwapWithApproval,
    isLoading: isLoading || writeContract.isPending,
    error,
    resetError,
    isSupportedChain: isKUBChain,
  };
};

export default useDEXSwap;