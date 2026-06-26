import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { hardhat, sepolia } from "wagmi/chains";

const useLocalChain = import.meta.env.VITE_CHAIN === "local";

export const targetChain = useLocalChain ? hardhat : sepolia;

const rpcUrl = useLocalChain
  ? (import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545")
  : (import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org");

export const moveChainAddress = import.meta.env.VITE_MOVECHAIN_ADDRESS as
  | `0x${string}`
  | undefined;

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http(useLocalChain ? rpcUrl : "http://127.0.0.1:8545"),
    [sepolia.id]: http(useLocalChain ? "https://rpc.sepolia.org" : rpcUrl),
  },
});

export function txExplorerUrl(hash: `0x${string}`): string | undefined {
  if (useLocalChain) return undefined;
  return `https://sepolia.etherscan.io/tx/${hash}`;
}
