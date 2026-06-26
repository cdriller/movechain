import { useEffect, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { simulateContract } from "@wagmi/core";
import { ContractFunctionExecutionError, type Abi, type ContractFunctionName } from "viem";
import { moveChainAbi } from "../abi/moveChain";
import { moveChainAddress, targetChain, wagmiConfig } from "../config";

type WriteFn = ContractFunctionName<typeof moveChainAbi, "nonpayable" | "payable">;

export function useMoveChainWrite(onConfirmed?: () => void) {
  const { isConnected, chainId } = useAccount();
  const [isSimulating, setIsSimulating] = useState(false);
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess
  } = useWaitForTransactionReceipt({hash: txHash});

  useEffect(() => {
    if (isSuccess) onConfirmed?.();
  }, [isSuccess, onConfirmed]);

  const reset = () => {
    resetWrite();
    setIsSimulating(false);
  };

  async function submit(
    functionName: WriteFn,
    args: readonly unknown[],
    value?: bigint,
  ): Promise<string | null> {
    reset();
    if (!isConnected) {
      return "Connect your wallet first";
    }
    if (chainId !== targetChain.id) {
      return `Switch your wallet to ${targetChain.name} (chain id ${targetChain.id})`;
    }
    setIsSimulating(true);
    try{
      const { request } = await simulateContract(wagmiConfig, {
        abi: moveChainAbi as Abi,
        address: moveChainAddress!,
        functionName,
        args: args as never,
        ...(value !== undefined ? { value } : {}),
      });
      writeContract(request);
    } catch (err: any) {
      if(err instanceof ContractFunctionExecutionError)
        return err.shortMessage;
      return err.reason || "Failed simulating transaction";
    } finally {
      setIsSimulating(false);
    }
    return null;
  }

  return {
    submit,
    txHash,
    writeError,
    busy: isSimulating || isPending || isConfirming,
    isSuccess,
    reset,
  };
}
