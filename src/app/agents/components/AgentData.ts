export interface Chain {
  name: string;
  icon: string;
}

export interface AgentData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  icon: string;
  chains: Chain[];
  lastAction: string;
  marketCap: number;
  totalSupply: number;
  circulatingSupply: number;
  treasuryValue: number;
  totalBurned: number;
  theme: 'green' | 'blue' | 'purple';
  subtitle: string;
  description: string;
  benefits: string[];
  activities: Array<{
    text: string;
    time: string;
  }>;
  statusBadge: string;
}

export const agentsData: AgentData[] = [
  {
    id: 'klawster',
    name: 'Klawster',
    symbol: '$KLAW',
    price: 0.0000135,
    priceChange24h: 5.2,
    icon: '/images/token-icons/klaw-icon.png',
    chains: [
      { name: 'kaia', icon: '/images/blockchain-icons/kaia-token-icon.png' }
    ],
    lastAction: '2 minutes ago',
    marketCap: 1250000,
    totalSupply: 1000000000,
    circulatingSupply: 85000000000,
    treasuryValue: 50000,
    totalBurned: 2500000000,
    theme: 'green',
    subtitle: 'OpenClaw-Powered Agent Token',
    description: 'An autonomous AI that trades DeFi on-chain. When AI agent generates profit, it automatically buys back and burns $KLAW tokens.',
    benefits: [
      'Auto Buybacks: Profits automatically buy and burn tokens',
      'Growing Treasury: Agent success increases token value',
      'AI-Powered: Autonomous trading across multiple chains',
      'Transparent: Every action verifiable on-chain'
    ],
    activities: [
      { text: 'Executed profitable trade: +2.3% ETH position', time: '15 minutes ago' },
      { text: 'Auto buyback & burn: 2,500 $KLAW removed', time: '2 minutes ago' },
      { text: 'New strategy activated: Momentum trading', time: 'Just now' },
      { text: 'Borrowed capital: 500 KUB for new position', time: '5 minutes ago' }
    ],
    statusBadge: 'Active'
  },
  {
    id: 'mantis',
    name: 'Mantis',
    symbol: '$MANTIS',
    price: 0.0000001,
    priceChange24h: 0.0,
    icon: '/images/token-icons/mantis-icon.png',
    chains: [ 
      { name: 'kub', icon: '/images/blockchain-icons/kub-chain-icon.png' }
    ],
    lastAction: 'N/A',
    marketCap: 890000,
    totalSupply: 1000000000,
    circulatingSupply: 75000000000,
    treasuryValue: 35000,
    totalBurned: 1200000000,
    theme: 'blue',
    subtitle: 'Autonomous Job Discovery AI',
    description: 'An AI agent that continuously scans the internet for freelance opportunities and posts micro-jobs for humans to complete, earning $MANTIS rewards.',
    benefits: [
      'AI-Powered Discovery: Autonomous web scraping and job posting',
      'Fair Rewards: Competitive $MANTIS payments for completed tasks',
      'Quality Matching: AI ensures optimal worker-job compatibility',
      'Passive Income: Earn while AI finds opportunities for you'
    ],
    activities: [
      { text: 'Discovered 15 new freelance opportunities', time: '10 minutes ago' },
      { text: 'Paid 42 workers: 2,500 $MANTIS distributed', time: '5 minutes ago' },
      { text: 'AI optimized pricing for 8 job categories', time: 'Just now' },
      { text: 'New quality control algorithm deployed', time: '15 minutes ago' }
    ],
    statusBadge: 'Scanning'
  },
  {
    id: 'babyclaw',
    name: 'BabyClaw',
    symbol: '$BABY',
    price: 0.0000001,
    priceChange24h: 0.0,
    icon: '/images/token-icons/baby-icon.png',
    chains: [
      { name: 'celo', icon: '/images/blockchain-icons/celo-icon.png' }
    ],
    lastAction: 'N/A',
    marketCap: 2170000,
    totalSupply: 1000000000,
    circulatingSupply: 60000000000,
    treasuryValue: 125000,
    totalBurned: 850000000,
    theme: 'purple',
    subtitle: 'Mini OpenClaw Protocol',
    description: 'A lightweight automation protocol enabling small projects to implement buyback/burn mechanisms without complex coding requirements.',
    benefits: [
      'Easy Integration: Deploy buyback/burn in minutes',
      'Low Barrier: Perfect for emerging token projects',
      'Revenue Sharing: Earn from platform transaction fees',
      'Launchpad Access: New projects use $BABY for deployment'
    ],
    activities: [
      { text: 'New project deployed BabyClaw integration', time: '1 minute ago' },
      { text: 'Protocol revenue: $2,450 collected today', time: '8 minutes ago' },
      { text: '5 new projects joined launchpad queue', time: '12 minutes ago' },
      { text: 'Automation milestone: 1,000 successful buybacks', time: '20 minutes ago' }
    ],
    statusBadge: 'Growing'
  }
];