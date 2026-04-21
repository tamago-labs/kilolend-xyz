import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// KUB Chain Testnet configuration
export const kubChain = defineChain({
  id: 25925,
  name: 'KUB Chain Testnet',
  nativeCurrency: {
    name: 'KUB',
    symbol: 'KUB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-testnet.bitkubchain.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'KubScan',
      url: 'https://testnet.kubscan.com',
    },
  },
});

export const config = getDefaultConfig({
  appName: 'KiloLend',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [kubChain],
});