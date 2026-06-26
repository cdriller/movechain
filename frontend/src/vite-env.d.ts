/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOVECHAIN_ADDRESS?: string;
  readonly VITE_TRIPCREDITS_ADDRESS?: string;
  /** Set to "local" for Hardhat node (31337). Omit or "sepolia" for Sepolia. */
  readonly VITE_CHAIN?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_GIT_SHA?: string;
  readonly VITE_GIT_REPO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
