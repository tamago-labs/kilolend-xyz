/**
 * AI Wallet Service
 * Handles API calls for AI wallet functionality
 */

interface AIWalletStatus {
  hasWallet: boolean;
  aiWalletAddress?: string;
  assignedAt?: string;
  agentId?: string | null;
  modelId?: string | null;
  status?: {
    totalWallets: number;
    usedWallets: number;
    availableWallets: number;
    utilizationRate: number;
  };
}

interface CreateAIWalletResponse {
  success: boolean;
  userAddress: string;
  aiWalletAddress: string;
  assignedAt: string;
  walletIndex: number;
  status: {
    totalWallets: number;
    usedWallets: number;
    availableWallets: number;
    utilizationRate: number;
  };
}

interface GetAPIKeyResponse {
  success: boolean;
  userAddress: string;
  aiWalletAddress: string;
  apiKey: string | null;
  apiKeyGeneratedAt: string;
  agentId?: string | null;
}

interface CreateAPIKeyResponse {
  success: boolean;
  userAddress: string;
  aiWalletAddress: string;
  apiKey: string;
  apiKeyGeneratedAt: string;
  action: 'api_key_generated';
}

interface DeleteAPIKeyResponse {
  success: boolean;
  userAddress: string;
  aiWalletAddress: string;
  apiKey: null;
  assignedAt: string;
  agentId?: string | null;
  action: 'api_key_deleted';
}

interface WithdrawNativeRequest {
  amount: string;
  chain_id: number;
}

interface WithdrawERC20Request {
  token_symbol: string;
  amount: string;
  chain_id: number;
}

interface WithdrawResponse {
  success: boolean;
  transaction_hash?: string;
  explorer_url?: string;
  message: string;
  amount: string;
  recipient: string;
  token_symbol?: string;
  chain_id: number;
}

interface APIError {
  error: string;
  statusCode?: number;
}

class AIWalletService {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    // These should be environment variables in production
    this.baseURL = 'https://kvxdikvk5b.execute-api.ap-southeast-1.amazonaws.com/prod';
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
  }

  /**
   * Get AI wallet status for a user
   */
  async getAIWalletStatus(userAddress: string): Promise<AIWalletStatus> {
    try {
 
      const url = new URL(`${this.baseURL}/ai-wallet`);
      url.searchParams.append('userAddress', userAddress);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
 

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI wallet status');
      }

      return data;
    } catch (error) {
      console.error('Error getting AI wallet status:', error);
      throw error;
    }
  }

  /**
   * Create a new AI wallet for a user
   */
  async createAIWallet(userAddress: string): Promise<CreateAIWalletResponse> {
    try {
      const response = await fetch(`${this.baseURL}/ai-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ userAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create AI wallet');
      }

      return data;
    } catch (error) {
      console.error('Error creating AI wallet:', error);
      throw error;
    }
  }

  /**
   * Create an AI agent for a user (assign agentId and modelId to existing AI wallet)
   */
  async createAgent(userAddress: string, agentId: string, modelId: string): Promise<AIWalletStatus> {
    try {
      const response = await fetch(`${this.baseURL}/ai-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ userAddress, agentId, modelId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create AI agent');
      }

      return data;
    } catch (error) {
      console.error('Error creating AI agent:', error);
      throw error;
    }
  }

  /**
   * Delete an AI agent for a user (remove agentId from AI wallet)
   */
  async deleteAgent(userAddress: string): Promise<AIWalletStatus> {
    try {
      const url = new URL(`${this.baseURL}/ai-agent`);
      url.searchParams.append('userAddress', userAddress);

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete AI agent');
      }

      return data;
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      throw error;
    }
  }

  /**
   * Get user's API key
   */
  async getAPIKey(userAddress: string): Promise<GetAPIKeyResponse> {
    try {
      const url = new URL(`${this.baseURL}/api-key`);
      url.searchParams.append('userAddress', userAddress);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get API key');
      }

      return data;
    } catch (error) {
      console.error('Error getting API key:', error);
      throw error;
    }
  }

  /**
   * Generate new API key for user
   */
  async createAPIKey(userAddress: string): Promise<CreateAPIKeyResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ userAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }

      return data;
    } catch (error) {
      console.error('Error creating API key:', error);
      throw error;
    }
  }

  /**
   * Delete user's API key
   */
  async deleteAPIKey(userAddress: string): Promise<DeleteAPIKeyResponse> {
    try {
      const url = new URL(`${this.baseURL}/api-key`);
      url.searchParams.append('userAddress', userAddress);

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete API key');
      }

      return data;
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  }
 
  

  /**
   * Validate Ethereum address format
   */
  isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Format address for display
   */
  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Withdraw native tokens from AI wallet to user's main wallet
   */
  async withdrawNativeToken(userAddress: string, amount: string, chainId: number): Promise<WithdrawResponse> {
    try {
      // First get the user's API key
      const apiKeyResponse = await this.getAPIKey(userAddress);
      
      if (!apiKeyResponse.apiKey) {
        throw new Error("You don't have an active API key. Generate one in the API Key section to enable withdrawals.");
      }

      const requestBody: WithdrawNativeRequest = {
        amount,
        chain_id: chainId
      };

      const response = await fetch(`https://api.kilolend.xyz/withdraw/native`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKeyResponse.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to withdraw native tokens');
      }

      return data;
    } catch (error) {
      console.error('Error withdrawing native tokens:', error);
      throw error;
    }
  }

  /**
   * Withdraw ERC-20 tokens from AI wallet to user's main wallet
   */
  async withdrawERC20Token(userAddress: string, tokenSymbol: string, amount: string, chainId: number): Promise<WithdrawResponse> {
    try {
      // First get the user's API key
      const apiKeyResponse = await this.getAPIKey(userAddress);
      
      if (!apiKeyResponse.apiKey) {
        throw new Error("You don't have an active API key. Generate one in the API Key section to enable withdrawals.");
      }

      const requestBody: WithdrawERC20Request = {
        token_symbol: tokenSymbol.toUpperCase(),
        amount,
        chain_id: chainId
      };

      const response = await fetch(`https://api.kilolend.xyz/withdraw/erc20`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKeyResponse.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to withdraw ERC-20 tokens');
      }

      return data;
    } catch (error) {
      console.error('Error withdrawing ERC-20 tokens:', error);
      throw error;
    }
  }

  /**
   * Check if a token is native on a specific chain
   */
  isNativeToken(symbol: string, chainId: number): boolean {
    const nativeTokens: Record<number, string[]> = {
      8217: ['KAIA'],
      96: ['KUB'],
      42793: ['XTZ'],
      128123: ['XTZ']
    };
    
    const chainNativeTokens = nativeTokens[chainId] || [];
    return chainNativeTokens.includes(symbol.toUpperCase());
  }

  /**
   * Withdraw tokens (automatically detects native vs ERC-20)
   */
  async withdrawToken(userAddress: string, tokenSymbol: string, amount: string, chainId: number): Promise<WithdrawResponse> {
    if (this.isNativeToken(tokenSymbol, chainId)) {
      return this.withdrawNativeToken(userAddress, amount, chainId);
    } else {
      return this.withdrawERC20Token(userAddress, tokenSymbol, amount, chainId);
    }
  }

  /**
   * Calculate USD value of token amount
   */
  calculateUSDValue(amount: string, price: number): number {
    const parsedAmount = parseFloat(amount);
    return isNaN(parsedAmount) ? 0 : parsedAmount * price;
  }
 
}

export const aiWalletService = new AIWalletService();
export type { 
  AIWalletStatus, 
  CreateAIWalletResponse, 
  GetAPIKeyResponse,
  CreateAPIKeyResponse,
  DeleteAPIKeyResponse,
  WithdrawNativeRequest,
  WithdrawERC20Request,
  WithdrawResponse,
  APIError 
};
