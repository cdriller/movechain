import { type ReactNode } from "react";
import { RiderView } from "./views/RiderView";
import { OperatorView } from "./views/OperatorView";
import { AdminView } from "./views/AdminView";
import { moveChainAddress, targetChain } from "./config";
import { isAddress } from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useRole, type Role } from "./lib/useRole";
import { shortAddress } from "./lib/trip";
import { GitCommitFooter } from "./components/GitCommitFooter";

const ROLE_LABELS: Record<Role, string> = {
  rider: "Rider",
  operator: "Operator",
  admin: "Admin",
};

function NetworkBadge() {
  return (
    <span className="network-badge" title={`Chain id ${targetChain.id}`}>
      <span className="network-dot" aria-hidden="true" />
      {targetChain.name}
    </span>
  );
}

function Landing() {
  const { connect, connectors, isPending } = useConnect();

  return (
    <div className="landing">
      <div className="hero">
        <h1 className="hero-title">MoveChain</h1>
        <p className="hero-tagline">remove chains and get free now</p>
        <button
          type="button"
          className="hero-cta"
          disabled={isPending || connectors.length === 0}
          onClick={() => connect({ connector: connectors[0] })}
        >
          {isPending ? "Connecting…" : "Connect your wallet"}
        </button>
        <p className="muted hero-hint">
          <NetworkBadge />
        </p>
      </div>
    </div>
  );
}

function WrongChain() {
  const { switchChain, isPending } = useSwitchChain();
  const { disconnect } = useDisconnect();

  return (
    <div className="landing">
      <div className="hero">
        <span className="hero-badge">MoveChain</span>
        <h1 className="hero-title">Wrong network</h1>
        <p className="hero-tagline">
          Switch your wallet to {targetChain.name} (chain id {targetChain.id}) to continue.
        </p>
        <button
          type="button"
          className="hero-cta"
          disabled={isPending}
          onClick={() => switchChain({ chainId: targetChain.id })}
        >
          {isPending ? "Switching…" : `Switch to ${targetChain.name}`}
        </button>
        <button type="button" className="link-button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GitCommitFooter />
    </>
  );
}

function AppHeader({ role }: { role: Role }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <header className="app-header card">
      <div className="app-header-left">
        <span className="hero-badge">MoveChain</span>
        <span className={`role-badge role-${role}`}>{ROLE_LABELS[role]}</span>
      </div>
      <div className="app-header-right">
        <NetworkBadge />
        <span className="muted mono">{shortAddress(address)}</span>
        <button type="button" className="secondary" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const { isConnected, chainId } = useAccount();
  const { role, isLoading } = useRole();

  const contractReady =
    moveChainAddress !== undefined && isAddress(moveChainAddress);

  if (!contractReady) {
    return (
      <AppLayout>
        <div className="landing">
          <div className="hero">
            <span className="hero-badge">MoveChain</span>
            <p className="error">
              {!moveChainAddress
                ? "Missing VITE_MOVECHAIN_ADDRESS — copy frontend/.env.example to frontend/.env"
                : "Invalid VITE_MOVECHAIN_ADDRESS. Address is not a valid ethereum address"}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isConnected) {
    return (
      <AppLayout>
        <Landing />
      </AppLayout>
    );
  }
  if (chainId !== targetChain.id) {
    return (
      <AppLayout>
        <WrongChain />
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="landing">
          <div className="hero">
            <span className="hero-badge">MoveChain</span>
            <p className="muted">Checking your access…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div>
        <AppHeader role={role} />
        {role === "rider" && <RiderView />}
        {role === "operator" && <OperatorView />}
        {role === "admin" && <AdminView />}
      </div>
    </AppLayout>
  );
}
