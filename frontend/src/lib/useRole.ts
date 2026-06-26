import { useAccount, useReadContract } from "wagmi";
import { moveChainAbi } from "../abi/moveChain";
import { moveChainAddress } from "../config";

export type Role = "rider" | "operator" | "admin";

/**
 * Derives the connected wallet's role from on-chain state.
 * Priority: admin > operator > rider (rider is the default for any wallet).
 * A wallet only ever resolves to a single role, so each user sees exactly one view.
 */
export function useRole() {
  const { address, isConnected } = useAccount();
  const enabled = isConnected && !!address && !!moveChainAddress;

  const { data: admin, isLoading: loadingAdmin } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "isAdmin",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: operator, isLoading: loadingOperator } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "operators",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const isAdmin = admin === true;
  const isOperator = (operator?.[0] ?? false) === true;
  const role: Role = isAdmin ? "admin" : isOperator ? "operator" : "rider";

  return {
    role,
    isAdmin,
    isOperator,
    isLoading: enabled && (loadingAdmin || loadingOperator),
  };
}
