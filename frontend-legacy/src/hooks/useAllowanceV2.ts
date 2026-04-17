import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useChainId } from 'wagmi';
import { kubChain, kaia } from '@/wagmi_config';
import { createPublicClient, http } from 'viem';
import { formatUnits, parseUnits } from 'viem';
import { CHAIN_CONTRACTS, CHAIN_CONFIGS } from '@/utils/chainConfig';
import { ChainId } from '@/utils/chainConfig';

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

export const useAllowanceV2 = (
  tokenAddress: string | undefined,
  spenderAddress: string | undefined,
  requiredAmount: string = '0'
) => {
  const { address } = useConnection();
  const chainId = useChainId();
  
  const [state, setState] = useState<AllowanceState>({
    allowance: '0',
    isSufficient: false,
    isLoading: false,
    error: null
  });

  // Get current chain configuration
  const getCurrentChain = useCallback(() => {
    if (chainId === kubChain.id) return 'kub';
    if (chainId === kaia.id) return 'kaia';
    return null;
  }, [chainId]);

  const currentChain = getCurrentChain();

  // Public client for reading data (memoized to prevent recreation)
  const publicClient = currentChain ? useMemo(() => createPublicClient({
    chain: currentChain === 'kub' ? kubChain : kaia,
    transport: http(),
  }), [currentChain]) : null;

  // Get native token address for current chain
  const getNativeTokenAddress = useCallback(() => {
    if (!currentChain) return null;
    const contracts = CHAIN_CONTRACTS[currentChain];
    if (currentChain === 'kub') {
      return (contracts as any).KUB || null;
    }
    if (currentChain === 'kaia') {
      return (contracts as any).KAIA || null;
    }
    return null;
  }, [currentChain]);

  // Check current allowance
  const checkAllowance = useCallback(async () => {
    if (!address || !tokenAddress || !spenderAddress || !currentChain || !publicClient) {
      setState(prev => ({
        ...prev,
        allowance: '0',
        isSufficient: false,
        isLoading: false,
        error: !currentChain ? 'Unsupported chain' : 'Missing parameters'
      }));
      return;
    }

    const nativeTokenAddress = getNativeTokenAddress();

    // For native tokens, no approval needed
    if (tokenAddress === nativeTokenAddress) {
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
  }, [address, tokenAddress, spenderAddress, requiredAmount, currentChain, publicClient, getNativeTokenAddress]);

  // Auto-check allowance when dependencies change
  useEffect(() => {
    if (tokenAddress && spenderAddress && address && currentChain && publicClient) {
      checkAllowance();
    } else {
      setState({
        allowance: '0',
        isSufficient: false,
        isLoading: false,
        error: null
      });
    }
  }, [tokenAddress, spenderAddress, address, currentChain, publicClient]); // Remove checkAllowance from dependencies

  // Watch for approval events to auto-refresh allowance (skip for native tokens)
  useEffect(() => {
    const nativeTokenAddress = getNativeTokenAddress();
    if (!tokenAddress || !address || !currentChain || !publicClient || tokenAddress === nativeTokenAddress) return;

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
  }, [tokenAddress, spenderAddress, address, currentChain, publicClient, checkAllowance, getNativeTokenAddress]);

  // Reset error state
  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    checkAllowance,
    resetError,
    currentChain
  };
};

export default useAllowanceV2;