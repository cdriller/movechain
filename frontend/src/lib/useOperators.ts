import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { isAddress } from "viem";
import { moveChainAbi } from "../abi/moveChain";
import { moveChainAddress } from "../config";

export interface OperatorInfo {
  address: `0x${string}`;
  whitelisted: boolean;
  price: bigint;
  earningsInEth: bigint;
  name: string;
}

// Assumes that config is validated in App.tsx
export function useOperators() {

  const {
    data: addresses,
    isLoading: isLoadingList,
    refetch,
  } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "getWhitelistedOperators",
  });

  const detailContracts = useMemo(
    () =>
      (addresses ?? []).map((addr) => ({
        address: moveChainAddress!,
        abi: moveChainAbi,
        functionName: "getOperator" as const,
        args: [addr] as const,
      })),
    [addresses],
  );

  const {
    data: details,
    isLoading: isLoadingDetails
  } = useReadContracts({
    contracts: detailContracts,
    query: { enabled: detailContracts.length > 0 },
  });

  const operators = useMemo<OperatorInfo[]>(() => {
    if (!addresses) return [];
    return addresses.map((addr, i) => {
      const detail = details?.[i]?.result as
        | {
            whitelisted: boolean;
            price: bigint;
            totalEarningsInEth: bigint;
            name: string;
          }
        | undefined;
      return {
        address: addr,
        whitelisted: detail?.whitelisted ?? true,
        price: detail?.price ?? 0n,
        earningsInEth: detail?.totalEarningsInEth ?? 0n,
        name: detail?.name ?? "",
      };
    });
  }, [addresses, details]);

  return {
    operators,
    isLoading: isLoadingList || isLoadingDetails,
    refetch,
  };
}
