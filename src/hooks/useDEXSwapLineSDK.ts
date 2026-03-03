import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useKaiaWalletSdk } from '@/components/Wallet/Sdk/walletSdk.hooks';
import { useWalletAccountStore } from '@/components/Wallet/Account/auth.hooks';
import { useAppStore } from '@/stores/appStore';
import { CHAIN_CONTRACTS, CHAIN_DEX_TOKENS, ChainId } from '@/utils/chainConfig';

// KAIA Mainnet RPC
const KAIA_RPC_URL = 'https://public-en.node.kaia.io';

// ERC-20 ABI
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Wrapped token ABI for wrap/unwrap operations
const WRAPPED_TOKEN_ABI = [
  'function deposit() payable',
  'function withdraw(uint amount)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Router ABI for DEX swaps (matching V1 exactly)
const ROUTER_ABI = [
  'function swapExactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 minAmountOut, uint160 limitSqrtP) params) external payable returns (uint256 amountOut)',
  'function multicall(bytes[] data) external payable returns (bytes[] results)',
  'function unwrapWeth(uint256 minAmount, address recipient) external',
  'function refundEth() external payable'
];

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
  slippage?: number; // Default 5%
}

export interface SwapResult {
  hash: string;
  requiredApproval: boolean;
  success: boolean;
  error?: string;
}

export interface DEXSwapLineSDKState {
  isLoading: boolean;
  error: string | null;
}

export interface DEXSwapLineSDKReturn {
  checkAllowance: (tokenAddress: string, spenderAddress: string) => Promise<string>;
  approveToken: (tokenAddress: string, spenderAddress: string, amount: string) => Promise<{ hash: string }>;
  executeSwap: (params: SwapParams) => Promise<{ hash: string; requiredApproval: boolean }>;
  executeSwapWithApproval: (params: SwapParams) => Promise<{ hash: string; requiredApproval: boolean }>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
  isSupportedChain: boolean;
}

class DEXSwapLineSDKService {
  private provider: ethers.JsonRpcProvider;
  private routerInterface: ethers.Interface;
  private wrappedTokenInterface: ethers.Interface;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(KAIA_RPC_URL);
    this.routerInterface = new ethers.Interface(ROUTER_ABI);
    this.wrappedTokenInterface = new ethers.Interface(WRAPPED_TOKEN_ABI);
  }

  /**
   * Get token allowance
   */
  async getTokenAllowance(
    tokenAddress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    try {
      if (tokenAddress === CHAIN_CONTRACTS.kaia.KAIA) {
        return 'unlimited'; // Native tokens don't need approval
      }

      const normalizedOwner = ethers.getAddress(owner);
      const normalizedSpender = ethers.getAddress(spender);
      const normalizedTokenAddress = ethers.getAddress(tokenAddress);

      const tokenContract = new ethers.Contract(
        normalizedTokenAddress,
        ERC20_ABI,
        this.provider
      );

      const allowance = await tokenContract.allowance(normalizedOwner, normalizedSpender);
      return ethers.formatUnits(allowance, 18);
    } catch (error) {
      console.error('Error getting token allowance:', error);
      return '0';
    }
  }

  /**
   * Create approval transaction
   */
  createApprovalTransaction(
    tokenAddress: string,
    spender: string,
    amount: string = 'unlimited'
  ): { to: string; data: string; value: string } {
    if (tokenAddress === CHAIN_CONTRACTS.kaia.KAIA) {
      throw new Error('Native token does not need approval');
    }

    const tokenInterface = new ethers.Interface(ERC20_ABI);
    const approvalAmount = amount === 'unlimited' 
      ? ethers.MaxUint256 
      : ethers.parseUnits(amount, 18);

    const data = tokenInterface.encodeFunctionData('approve', [spender, approvalAmount]);

    return {
      to: ethers.getAddress(tokenAddress),
      data,
      value: '0x0',
    };
  }

  /**
   * Create swap transaction for KAIA DEX
   */
  createSwapTransaction(
    params: SwapParams,
    account: string
  ): { to: string; data: string; value: string; gasLimit: string } {
    try {
      const { tokenIn, tokenOut, amountIn, amountOutMin } = params;
      const amountInWei = ethers.parseUnits(amountIn, 18);
      const amountOutMinWei = ethers.parseUnits(amountOutMin, 18);
      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
      const fee = 10000; // 1% fee tier

      // Handle native ↔ wrapped token swaps
      const isNativeIn = tokenIn === CHAIN_CONTRACTS.kaia.KAIA;
      const isNativeOut = tokenOut === CHAIN_CONTRACTS.kaia.KAIA;
      const wrappedToken = CHAIN_CONTRACTS.kaia.WKAIA;

      if (isNativeIn && tokenOut === wrappedToken) {
        // KAIA → WKAIA (wrap)
        return {
          to: wrappedToken,
          data: this.wrappedTokenInterface.encodeFunctionData('deposit', []),
          value: amountInWei.toString(),
          gasLimit: '0x15F90' // 90,000 gas for wrap
        };
      }

      if (tokenIn === wrappedToken && isNativeOut) {
        // WKAIA → KAIA (unwrap)
        return {
          to: wrappedToken,
          data: this.wrappedTokenInterface.encodeFunctionData('withdraw', [amountInWei]),
          value: '0x0',
          gasLimit: '0x15F90' // 90,000 gas for unwrap
        };
      }

      // Token swaps using Router with multicall (matching V1 logic)
      const tokenInForSwap = isNativeIn ? wrappedToken : tokenIn;
      const tokenOutForSwap = isNativeOut ? wrappedToken : tokenOut;
      const router = CHAIN_CONTRACTS.kaia.Router;

      const recipient = isNativeOut ? router : ethers.getAddress(account);

      const swapParams = {
        tokenIn: ethers.getAddress(tokenInForSwap),
        tokenOut: ethers.getAddress(tokenOutForSwap),
        fee: fee,
        recipient: recipient,
        deadline: BigInt(deadline),
        amountIn: amountInWei,
        minAmountOut: amountOutMinWei,
        limitSqrtP: BigInt(0) // no price limit
      };

      // Build multicall data based on swap direction (matching V1)
      let multicallData: string[] = [];

      if (isNativeIn) {
        // Native → Token: Router auto-wraps, just swap
        multicallData = [
          this.routerInterface.encodeFunctionData('swapExactInputSingle', [swapParams])
        ];
      } else if (isNativeOut) {
        // Token → Native: Swap to wrapped then unwrap
        multicallData = [
          this.routerInterface.encodeFunctionData('swapExactInputSingle', [swapParams]),
          this.routerInterface.encodeFunctionData('unwrapWeth', [0, ethers.getAddress(account)])
        ];
      } else {
        // Token ↔ Token: Standard swap
        multicallData = [
          this.routerInterface.encodeFunctionData('swapExactInputSingle', [swapParams])
        ];
      }

      const multicallDataEncoded = this.routerInterface.encodeFunctionData('multicall', [multicallData]);

      return {
        to: router,
        data: multicallDataEncoded,
        value: isNativeIn ? amountInWei.toString() : '0x0',
        gasLimit: '0x989680' // 1,000,000 gas for swaps (10x increase)
      };

    } catch (error) {
      console.error('Error creating swap transaction:', error);
      throw new Error('Failed to create swap transaction');
    }
  }
}

// Singleton instance
const dexSwapLineSDKService = new DEXSwapLineSDKService();

export const useDEXSwapLineSDK = (): DEXSwapLineSDKReturn => {
  const { account } = useWalletAccountStore();
  const { sendTransaction } = useKaiaWalletSdk();
  const { gasLimit } = useAppStore();

  const [state, setState] = useState<DEXSwapLineSDKState>({
    isLoading: false,
    error: null,
  });

  const updateState = useCallback((updates: Partial<DEXSwapLineSDKState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Check token allowance
   */
  const checkAllowance = useCallback(async (
    tokenAddress: string,
    spenderAddress: string
  ): Promise<string> => {
    if (!account) {
      throw new Error('Wallet not connected');
    }

    try {
      const allowance = await dexSwapLineSDKService.getTokenAllowance(
        tokenAddress,
        account,
        spenderAddress
      );
      return allowance;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return '0';
    }
  }, [account]);

  /**
   * Approve token for spending
   */
  const approveToken = useCallback(async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<{ hash: string }> => {
    if (!account) {
      throw new Error('Wallet not connected');
    }

    if (tokenAddress === CHAIN_CONTRACTS.kaia.KAIA) {
      return { hash: 'native-token-no-approval' };
    }

    updateState({ isLoading: true, error: null });

    try {
      const approvalTx = dexSwapLineSDKService.createApprovalTransaction(
        tokenAddress,
        spenderAddress,
        amount
      );

      // Format for LINE SDK - ensure value is properly formatted as hexadecimal
      const transaction = {
        from: account,
        to: approvalTx.to,
        value: approvalTx.value.startsWith('0x') ? approvalTx.value : '0x' + BigInt(approvalTx.value).toString(16),
        gas: `0x${Math.min(gasLimit, 300000).toString(16)}`, // Increased to 300k for approvals
        data: approvalTx.data,
      };

      await sendTransaction([transaction]);
      
      updateState({ isLoading: false });

      // For LINE SDK, use simple "pending" hash - modal can show wallet address link
      return { hash: 'pending' };
    } catch (error: any) {
      console.error('Error approving token:', error);
      const errorMessage = error.message || 'Approval failed';

      updateState({
        isLoading: false,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  }, [account, sendTransaction, gasLimit, updateState]);

  /**
   * Execute swap
   */
  const executeSwap = useCallback(async (params: SwapParams): Promise<{ hash: string; requiredApproval: boolean }> => {
    if (!account) {
      throw new Error('Wallet not connected');
    }

    updateState({ isLoading: true, error: null });

    try {
      const swapTx = dexSwapLineSDKService.createSwapTransaction(params, account);

      // Format for LINE SDK - ensure value is properly formatted as hexadecimal
      const transaction = {
        from: account,
        to: swapTx.to,
        value: swapTx.value.startsWith('0x') ? swapTx.value : '0x' + BigInt(swapTx.value).toString(16),
        gas: swapTx.gasLimit,
        data: swapTx.data,
      };

      await sendTransaction([transaction]);
      
      updateState({ isLoading: false });

      return { 
        hash: 'pending',
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
  }, [account, sendTransaction, updateState]);

  /**
   * Execute swap with approval check
   */
  const executeSwapWithApproval = useCallback(async (params: SwapParams): Promise<{ hash: string; requiredApproval: boolean }> => {
    const routerAddress = CHAIN_CONTRACTS.kaia.Router;

    // Check if approval is needed (skip for native KAIA)
    const isNativeIn = params.tokenIn === CHAIN_CONTRACTS.kaia.KAIA;
    const isWrapUnwrap = (params.tokenIn === CHAIN_CONTRACTS.kaia.KAIA && params.tokenOut === CHAIN_CONTRACTS.kaia.WKAIA) ||
                         (params.tokenIn === CHAIN_CONTRACTS.kaia.WKAIA && params.tokenOut === CHAIN_CONTRACTS.kaia.KAIA);
    
    let requiredApproval = false;

    if (!isNativeIn && !isWrapUnwrap) {
      const currentAllowance = await checkAllowance(params.tokenIn, routerAddress);
      const amountInWei = ethers.parseUnits(params.amountIn, 18);
      const allowanceWei = ethers.parseUnits(currentAllowance, 18);

      if (allowanceWei < amountInWei) {
        // Approval needed
        await approveToken(params.tokenIn, routerAddress, params.amountIn);
        requiredApproval = true;
      }
    }

    // Execute swap
    const swapResult = await executeSwap(params);

    return { ...swapResult, requiredApproval };
  }, [checkAllowance, approveToken, executeSwap]);

  return {
    checkAllowance,
    approveToken,
    executeSwap,
    executeSwapWithApproval,
    isLoading: state.isLoading,
    error: state.error,
    resetError,
    isSupportedChain: true, // LINE SDK is always on KAIA
  };
};