import { useState, useEffect, useCallback } from 'react';
import { useConnection, useChainId } from 'wagmi';
import { kubChain } from '@/wagmi_config';
import { formatUnits } from 'viem';
import { createPublicClient, http } from 'viem';

// Simple ERC20 ABI for balance
const erc20Abi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export const useTokenBalance = (tokenAddress?: string) => {
  const { address } = useConnection();
  const chainId = useChainId();
  const isKUBChain = chainId === kubChain.id;

  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address || !tokenAddress || !isKUBChain) {
      setBalance('0');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = createPublicClient({
        chain: kubChain,
        transport: http(),
      });

      const balanceRaw = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      const formattedBalance = formatUnits(balanceRaw as bigint, 18);
      setBalance(formattedBalance);
    } catch (err: any) {
      console.error('Error fetching balance:', err);
      setError(err.message || 'Failed to fetch balance');
      setBalance('0');
    } finally {
      setIsLoading(false);
    }
  }, [address, tokenAddress, isKUBChain]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
};

export default useTokenBalance;