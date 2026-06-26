import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { moveChainAbi } from "../abi/moveChain";
import { moveChainAddress } from "../config";
import { TxStatus } from "../components/TxStatus";
import { QrScanner } from "../components/QrScanner";
import { useMoveChainWrite } from "../lib/useMoveChainWrite";
import {
  ACTION_START,
  type TripQrPayload,
  actionLabel,
  decodeTripPayload,
  formatDeadline,
  shortAddress,
} from "../lib/trip";

export function OperatorView() {
  const { address, isConnected } = useAccount();
  const enabled = moveChainAddress !== undefined && !!address;

  const [scanned, setScanned] = useState<TripQrPayload | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "creditsOf",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: myInfo } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "getOperator",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const tripWrite = useMoveChainWrite(() => {
    void refetchBalance();
  });

  const whitelisted = myInfo?.whitelisted ?? false;
  const myPrice = myInfo?.price ?? 0n;
  const myName = myInfo?.name ?? "";
  const earnedCredits = balance ?? 0n;

  function handleScan(text: string) {
    setScanError(null);
    setFormError(null);
    try {
      setScanned(decodeTripPayload(text));
    } catch (e) {
      setScanned(null);
      setScanError(e instanceof Error ? e.message : "Invalid QR payload");
    }
  }

  async function submitTrip() {
    if (!scanned) return;
    const fn = scanned.action === ACTION_START ? "startTrip" : "completeTrip";
    const err = await tripWrite.submit(fn, [
      scanned.rider,
      BigInt(scanned.deadline),
      scanned.signature,
    ]);
    setFormError(err);
  }

  return (
    <section className="card">
      <h2>Operator</h2>
      <p className="muted">
        Scan a rider&apos;s QR code and relay their signed authorization on-chain.
      </p>

      <div className="status-line">
        <span>
          Name: <strong>{enabled ? myName || "—" : "—"}</strong>
        </span>
        <span>
          Whitelisted: <strong>{enabled ? (whitelisted ? "yes" : "no") : "—"}</strong>
        </span>
        <span>
          Your trip price: <strong>{myPrice.toString()} credits</strong>
        </span>
      </div>

      <div className="operator-list">
        <h3>Scan rider QR</h3>
        <QrScanner onScan={handleScan} />
        {scanError && <p className="error">{scanError}</p>}

        {scanned && (
          <div className="scan-result">
            <h4>Confirm &amp; submit</h4>
            <div className="status-line">
              <span>
                Action: <strong>{actionLabel(scanned.action)}</strong>
              </span>
              <span>
                Rider: <span className="mono">{shortAddress(scanned.rider)}</span>
              </span>
              <span>
                Operator:{" "}
                <span className="mono">{shortAddress(scanned.operator)}</span>
              </span>
              <span>Valid until {formatDeadline(scanned.deadline)}</span>
            </div>
            {address &&
              scanned.operator.toLowerCase() !== address.toLowerCase() && (
                <p className="error">
                  This authorization is for operator{" "}
                  {shortAddress(scanned.operator)}, not the connected wallet.
                </p>
              )}
            <div className="row">
              <button
                type="button"
                disabled={!isConnected || tripWrite.busy}
                onClick={submitTrip}
              >
                Submit {actionLabel(scanned.action)} on-chain
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setScanned(null)}
              >
                Clear
              </button>
            </div>
            {tripWrite.busy && (
              <p className="muted">Waiting for wallet / confirmation…</p>
            )}
            {formError && <p className="error">{formError}</p>}
            <TxStatus hash={tripWrite.txHash} error={tripWrite.writeError} />
          </div>
        )}
      </div>

      <div className="operator-list">
        <h3>Balance</h3>
        <p className="balance-amount">{earnedCredits.toString()} credits</p>
      </div>
    </section>
  );
}
