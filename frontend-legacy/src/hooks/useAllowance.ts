import { useState, useEffect, useCallback } from 'react';
import { useConnection, useChainId } from 'wagmi';
import { kubChain } from '@/wagmi_config';
import { createPublicClient, http } from 'viem';
import { formatUnits, parseUnits } from 'viem';
import { KUB_DEX_CONTRACTS } from './useDEXQuote';

// ERC20 ABI for allowance
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
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'spender', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Approval',
    type: 'event'
  }
] as const;

export interface AllowanceState {
  allowance: string;
  isSufficient: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAllowance = (
  tokenAddress: string | undefined,
  spenderAddress: string | undefined,
  requiredAmount: string = '0'
) => {
  const { address } = useConnection();
  const chainId = useChainId();
  const isKUBChain = chainId === kubChain.id;

  const [state, setState] = useState<AllowanceState>({
    allowance: '0',
    isSufficient: false,
    isLoading: false,
    error: null
  });

  // Public client for reading data
  const publicClient = createPublicClient({
    chain: kubChain,
    transport: http(),
  });

  // Check current allowance
  const checkAllowance = useCallback(async () => {
    if (!address || !tokenAddress || !spenderAddress || !isKUBChain) {
      setState(prev => ({
        ...prev,
        allowance: '0',
        isSufficient: false,
        isLoading: false,
        error: !isKUBChain ? 'Wrong chain' : 'Missing parameters'
      }));
      return;
    }

    // For native KUB, no approval needed
    if (tokenAddress === KUB_DEX_CONTRACTS.KUB) {
      setState({
        allowance: '999999999', // Mock unlimited allowance
        isSufficient: true,
        isLoading: false,
        error: null
      });
      return '999999999';
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, spenderAddress as `0x${string}`],
      });

      const allowanceFormatted = formatUnits(allowance as bigint, 18);
      const requiredAmountWei = parseUnits(requiredAmount || '0', 18);
      const allowanceWei = parseUnits(allowanceFormatted, 18);
      const isSufficient = allowanceWei >= requiredAmountWei;

      setState({
        allowance: allowanceFormatted,
        isSufficient,
        isLoading: false,
        error: null
      });

      return allowanceFormatted;
    } catch (err: any) {
      console.error('Error checking allowance:', err);
      setState(prev => ({
        ...prev,
        allowance: '0',
        isSufficient: false,
        isLoading: false,
        error: err.message || 'Failed to check allowance'
      }));
      return '0';
    }
  }, [address, tokenAddress, spenderAddress, requiredAmount, isKUBChain, publicClient]);

  // Auto-check allowance when dependencies change
  useEffect(() => {
    if (tokenAddress && spenderAddress && address && isKUBChain) {
      checkAllowance();
    } else {
      setState({
        allowance: '0',
        isSufficient: false,
        isLoading: false,
        error: null
      });
    }
  }, [tokenAddress, spenderAddress, address, isKUBChain]); // Remove checkAllowance from dependencies

  // Watch for approval events to auto-refresh allowance (skip for native KUB)
  useEffect(() => {
    if (!tokenAddress || !address || !isKUBChain || tokenAddress === KUB_DEX_CONTRACTS.KUB) return;

    const unwatch = publicClient.watchContractEvent({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      eventName: 'Approval',
      args: {
        owner: address as `0x${string}`,
        spender: spenderAddress as `0x${string}`,
      },
      onLogs: (logs) => {
        console.log('Approval event detected:', logs);
        // Refresh allowance after approval event
        setTimeout(() => {
          checkAllowance();
        }, 2000); // Small delay to ensure state is updated
      },
    });

    return () => {
      unwatch();
    };
  }, [tokenAddress, spenderAddress, address, isKUBChain, publicClient]); // Remove checkAllowance from dependencies

  // Reset error state
  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    checkAllowance,
    resetError
  };
};

export default useAllowance;