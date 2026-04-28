"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { ERC20_ABI } from "@/config/abi";
import { KUB_TESTNET_TOKENS } from "@/config/tokens";
import { useTestnetTokenContext } from "@/contexts/TestnetTokenContext";
import { useAccount } from "wagmi";
import { useEffect } from "react";

export function useMintToken(tokenKey: string) {
  const token = KUB_TESTNET_TOKENS[tokenKey];
  const { address } = useAccount();
  const { actions } = useTestnetTokenContext();

  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Update mint status based on transaction state
  useEffect(() => {
    if (isWritePending) {
      actions.setMintStatus(tokenKey, "pending");
    } else if (isConfirming) {
      actions.setMintStatus(tokenKey, "confirming");
    } else if (isSuccess) {
      actions.setMintStatus(tokenKey, "success");
      actions.refreshBalances();
      // Auto-reset after 3 seconds
      const timeout = setTimeout(() => {
        actions.resetMintStatus(tokenKey);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isWritePending, isConfirming, isSuccess, tokenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle errors
  useEffect(() => {
    const error = writeError || confirmError;
    if (error) {
      actions.setMintStatus(tokenKey, "error");
      actions.setMintError(
        tokenKey,
        error instanceof Error ? error.message : "Transaction failed"
      );
    }
  }, [writeError, confirmError, tokenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const mint = (amount: string) => {
    if (!address || !token) return;

    actions.resetMintStatus(tokenKey);

    const parsedAmount = parseUnits(amount, token.decimals);

    writeContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [address, parsedAmount],
    });
  };

  return {
    mint,
    txHash,
    isWritePending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
  };
}