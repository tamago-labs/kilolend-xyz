import { useMemo } from "react";
import { useReadContract, useAccount } from "wagmi";
import { MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI, IRM_ABI } from "@/config/abi";

const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;
const WAD = 10n ** 18n;

export interface MarketInfo {
  marketData: {
    totalSupplyAssets: bigint;
    totalSupplyShares: bigint;
    totalBorrowAssets: bigint;
    totalBorrowShares: bigint;
    lastUpdate: bigint;
    fee: bigint;
  } | undefined;
  marketParams: {
    loanToken: `0x${string}`;
    collateralToken: `0x${string}`;
    oracle: `0x${string}`;
    irm: `0x${string}`;
    lltv: bigint;
  } | undefined;
  position: {
    supplyShares: bigint;
    borrowShares: bigint;
    collateral: bigint;
  } | undefined;
  borrowRate: bigint | undefined;
  borrowAPY: number;
  supplyAPY: number;
  utilization: number;
  lltvPercent: number;
  userSupplyAssets: bigint;
  userBorrowAssets: bigint;
  loading: boolean;
}

// Raw types from contract (tuple format)
interface RawMarketData {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
}

interface RawMarketParams {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  oracle: `0x${string}`;
  irm: `0x${string}`;
  lltv: bigint;
}

interface RawPosition {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
}

/**
 * Unified hook that fetches market data and calculates all derived values
 * (borrow rate, APY, utilization, user position, etc.)
 */
export function useMarketInfo(marketId: `0x${string}` | undefined): MarketInfo {
  const { address } = useAccount();
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

  // Fetch market data
  const {
    data: rawMarketData,
    isLoading: marketLoading,
  } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "market",
    args: marketId ? [marketId] : undefined,
    query: { enabled: !!marketId },
  });

  // Fetch market params
  const { data: rawMarketParams } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "idToMarketParams",
    args: marketId ? [marketId] : undefined,
    query: { enabled: !!marketId },
  });

  // Fetch user position
  const { data: rawPosition } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "position",
    args: marketId ? [marketId, address ?? zeroAddress] : undefined,
    query: { enabled: !!marketId && !!address },
  });

  // Get IRM address from market params
  const irmAddress = rawMarketParams?.irm;
  
  // Fetch borrow rate from IRM 
  const { data: rawBorrowRate } = useReadContract({
    address: irmAddress,
    abi: IRM_ABI,
    functionName: "borrowRateView",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: (rawMarketParams && rawMarketData) ? [rawMarketParams as any, rawMarketData as any] : undefined,
    query: { enabled: !!irmAddress && !!rawMarketParams && !!rawMarketData},
  });


  // Parse market data
  const marketData = useMemo((): MarketInfo["marketData"] => {
    if (!rawMarketData) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = rawMarketData as any;
    return {
      totalSupplyAssets: data.totalSupplyAssets ?? data[0],
      totalSupplyShares: data.totalSupplyShares ?? data[1],
      totalBorrowAssets: data.totalBorrowAssets ?? data[2],
      totalBorrowShares: data.totalBorrowShares ?? data[3],
      lastUpdate: data.lastUpdate ?? data[4],
      fee: data.fee ?? data[5],
    };
  }, [rawMarketData]);

  // Parse market params
  const marketParams = useMemo((): MarketInfo["marketParams"] => {
    if (!rawMarketParams) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = rawMarketParams as any;
    return {
      loanToken: params.loanToken ?? params[0],
      collateralToken: params.collateralToken ?? params[1],
      oracle: params.oracle ?? params[2],
      irm: params.irm ?? params[3],
      lltv: params.lltv ?? params[4],
    };
  }, [rawMarketParams]);

  // Parse position
  const position = useMemo((): MarketInfo["position"] => {
    if (!rawPosition) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pos = rawPosition as any;
    return {
      supplyShares: pos.supplyShares ?? pos[0],
      borrowShares: pos.borrowShares ?? pos[1],
      collateral: pos.collateral ?? pos[2],
    };
  }, [rawPosition]);

  // Calculate borrow rate
  const borrowRate = rawBorrowRate as bigint | undefined;

  // Calculate borrow APY
  // borrowRate is in WAD per second (e.g., 317097919 = 0.000000000317097919 WAD/sec)
  // APY = (borrowRate * 31536000) / 10^18 * 100 = percentage
  const borrowAPY = useMemo(() => {
    if (!borrowRate || borrowRate === 0n) return 0;
    try {
      const ratePerYear =
        (Number(borrowRate) * Number(SECONDS_PER_YEAR)) / Number(WAD);
      const apy = ratePerYear * 100;
      return apy;
    } catch {
      return 0;
    }
  }, [borrowRate]);

  // Calculate utilization
  const utilization = useMemo(() => {
    if (
      !marketData ||
      !marketData.totalSupplyAssets ||
      marketData.totalSupplyAssets === 0n
    )
      return 0;
    try {
      const util =
        (Number(marketData.totalBorrowAssets) /
          Number(marketData.totalSupplyAssets)) *
        100;
      return Math.min(100, Math.max(0, util));
    } catch {
      return 0;
    }
  }, [marketData]);

  // Calculate supply APY
  // Supply APY = Borrow APY × Utilization × (1 - fee)
  const supplyAPY = useMemo(() => {
    if (!marketData) return 0;
    const feeMultiplier = 1 - Number(marketData.fee) / 1e18;
    return borrowAPY * (utilization / 100) * feeMultiplier;
  }, [borrowAPY, utilization, marketData]);

  // Calculate LTV percentage
  const lltvPercent = useMemo(() => {
    if (!marketParams || !marketParams.lltv) return 75; // Default 75%
    try {
      return Number(marketParams.lltv) / 1e16;
    } catch {
      return 75;
    }
  }, [marketParams]);

  // Calculate user's supply assets from shares
  const userSupplyAssets = useMemo(() => {
    if (!position || !marketData) return 0n;
    const supplyShares = position.supplyShares;
    const totalSupplyAssets = marketData.totalSupplyAssets;
    const totalSupplyShares = marketData.totalSupplyShares;

    if (totalSupplyShares === 0n) {
      return supplyShares;
    }
    return (supplyShares * totalSupplyAssets) / totalSupplyShares;
  }, [position, marketData]);

  // Calculate user's borrow assets from shares
  const userBorrowAssets = useMemo(() => {
    if (!position || !marketData) return 0n;
    const borrowShares = position.borrowShares;
    const totalBorrowAssets = marketData.totalBorrowAssets;
    const totalBorrowShares = marketData.totalBorrowShares;

    if (totalBorrowShares === 0n) {
      return borrowShares;
    }
    return (borrowShares * totalBorrowAssets) / totalBorrowShares;
  }, [position, marketData]);

  return {
    marketData,
    marketParams,
    position,
    borrowRate,
    borrowAPY,
    supplyAPY,
    utilization,
    lltvPercent,
    userSupplyAssets,
    userBorrowAssets,
    loading: marketLoading,
  };
}
