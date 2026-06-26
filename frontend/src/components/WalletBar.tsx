import { useAccount, useConnect, useDisconnect } from "wagmi";
import { moveChainAddress, targetChain } from "../config";
import { shortAddress } from "../lib/trip";

export function WalletBar() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const wrongChain = isConnected && chainId !== targetChain.id;

  return (
    <div className="wallet-bar">
      <div className="row" style={{ marginTop: 0, justifyContent: "space-between" }}>
        <span className="muted mono">
          {moveChainAddress
            ? `Contract ${shortAddress(moveChainAddress)} · ${targetChain.name}`
            : "No contract address configured"}
        </span>
        {isConnected ? (
          <span className="row" style={{ marginTop: 0 }}>
            <span className="mono">{shortAddress(address)}</span>
            <button type="button" className="secondary" onClick={() => disconnect()}>
              Disconnect
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => connect({ connector: connectors[0] })}
          >
            {isPending ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </div>
      {wrongChain && (
        <p className="error">
          Wrong network — switch your wallet to {targetChain.name} (chain id{" "}
          {targetChain.id}).
        </p>
      )}
    </div>
  );
}
