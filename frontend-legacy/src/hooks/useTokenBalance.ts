import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useChainId } from 'wagmi';
import { kubChain, kaia } from '@/wagmi_config';
import { formatUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { CHAIN_CONTRACTS } from '@/utils/chainConfig';
import { useAuth } from '@/contexts/ChainContext';
import { useWalletAccountStore } from '@/components/Wallet/Account/auth.hooks';

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
  const { account : address } = useWalletAccountStore();
  const chainId = useChainId();
  const { selectedAuthMethod } = useAuth();

  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine current chain and configuration
  const getCurrentChain = useCallback(() => {
    // For LINE SDK, always use KAIA
    if (selectedAuthMethod === 'line_sdk') {
      return {
        chain: 'kaia',
        viemChain: kaia,
        contracts: CHAIN_CONTRACTS.kaia
      };
    }

    // For Web3 wallet, use current chain
    if (chainId === kubChain.id) {
      return {
        chain: 'kub',
        viemChain: kubChain,
        contracts: CHAIN_CONTRACTS.kub
      };
    }

    if (chainId === 8217) { // KAIA chain ID
      return {
        chain: 'kaia',
        viemChain: kaia,
        contracts: CHAIN_CONTRACTS.kaia
      };
    }

    return null;
  }, [chainId, selectedAuthMethod]);

  const currentChain = useMemo(() => getCurrentChain(), [getCurrentChain]);

  const fetchBalance = useCallback(async () => {
    if (!address || !tokenAddress || !currentChain) {
      setBalance('0');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = createPublicClient({
        chain: currentChain.viemChain,
        transport: http(),
      });

      let balanceRaw: bigint;
      const { contracts } = currentChain;

      // Check if it's native token for current chain
      if (
        (currentChain.chain === 'kub' && tokenAddress === (contracts as any).KUB) ||
        (currentChain.chain === 'kaia' && tokenAddress === (contracts as any).KAIA)
      ) {
        // Get native token balance
        balanceRaw = await publicClient.getBalance({
          address: address as `0x${string}`,
        });
      } else {
        // Get ERC20 token balance
        balanceRaw = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });
      }

      const formattedBalance = formatUnits(balanceRaw, 18);
      setBalance(formattedBalance);
    } catch (err: any) {
      console.error('Error fetching balance:', err);
      setError(err.message || 'Failed to fetch balance');
      setBalance('0');
    } finally {
      setIsLoading(false);
    }
  }, [address, tokenAddress, currentChain]);

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
