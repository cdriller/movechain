import { useState } from "react";
import { isAddress } from "viem";
import {
  addressExplorerUrl,
  moveChainAddress,
  tripCreditsAddress,
} from "../config";
import { copyAddress, shortAddress } from "../lib/addressDisplay";
import { gitCommitInfo } from "../lib/gitInfo";

function FooterSep() {
  return <span className="app-footer-sep">·</span>;
}

function AddressChip({
  label,
  address,
}: {
  label: string;
  address: `0x${string}`;
}) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = addressExplorerUrl(address);

  async function handleCopy() {
    await copyAddress(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="app-footer-contract mono muted">
      {explorerUrl ? (
        <a
          className="app-footer-contract-name"
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      ) : (
        <span className="app-footer-contract-name">{label}</span>
      )}{" "}
      <button
        type="button"
        className={`app-footer-address${copied ? " copied" : ""}`}
        title={address}
        onClick={() => void handleCopy()}
      >
        {shortAddress(address)}
      </button>
    </span>
  );
}

export function GitCommitFooter() {
  const commit = gitCommitInfo();
  const moveChain =
    moveChainAddress && isAddress(moveChainAddress)
      ? moveChainAddress
      : undefined;
  const tripCredits =
    tripCreditsAddress && isAddress(tripCreditsAddress)
      ? tripCreditsAddress
      : undefined;

  if (!commit && !moveChain && !tripCredits) return null;

  return (
    <footer className="app-footer">
      {moveChain && <AddressChip label="MoveChain" address={moveChain} />}
      {moveChain && tripCredits && <FooterSep />}
      {tripCredits && (
        <AddressChip label="TripCredits" address={tripCredits} />
      )}
      {(moveChain || tripCredits) && commit && <FooterSep />}
      {commit &&
        (commit.url ? (
          <a
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            title={commit.sha}
          >
            {commit.shortSha}
          </a>
        ) : (
          <span className="mono muted" title={commit.sha}>
            {commit.shortSha}
          </span>
        ))}
    </footer>
  );
}
