import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAccount, useReadContract, useSignTypedData } from "wagmi";
import { formatEther, isAddress } from "viem";
import { moveChainAbi } from "../abi/moveChain";
import { moveChainAddress, targetChain } from "../config";
import { TxStatus } from "../components/TxStatus";
import { useOperators } from "../lib/useOperators";
import { useMoveChainWrite } from "../lib/useMoveChainWrite";
import {
  ACTION_START,
  ACTION_STOP,
  type TripAction,
  type TripQrPayload,
  actionLabel,
  buildDomain,
  encodeTripPayload,
  formatDeadline,
  tripAuthTypes,
} from "../lib/trip";

const SIGNATURE_TTL_SECONDS = 5 * 60;

// Hardcoded for now to avoid the on-chain price read error.
// Must match MoveChain.ethToCredit (0.0002 ETH per credit).
const ETH_TO_CREDIT =  100_000_000n;

export function RiderView() {
  const { address, isConnected } = useAccount();
  const { operators } = useOperators();

  const [amount, setAmount] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  //const [action, setAction] = useState<TripAction>(ACTION_START);
  const [payload, setPayload] = useState<TripQrPayload | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "creditsOf",
    args: address ? [address] : undefined,
  });

  const { data: onTrip, refetch: refetchOnTrip } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "isOnTrip",
    args: address ? [address] : undefined,
  });

  const { data: tripOperator, refetch: refetchtripOperator } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "getTripOperator",
    args: address ? [address] : undefined,
  });



  const { refetch: refetchNonce } = useReadContract({
    address: moveChainAddress,
    abi: moveChainAbi,
    functionName: "getNonce",
    args: address ? [address] : undefined,
  });

  const buy = useMoveChainWrite(() => {
    void refetchBalance();
  });

  const { signTypedDataAsync } = useSignTypedData();

  const currentOperatorName = useMemo(() => {
    if (!tripOperator) return undefined;
    const op = operators.find(
      (o) => o.address.toLowerCase() === (tripOperator as string).toLowerCase(),
    );
    return op?.name;
  }, [operators, tripOperator]);

  const cost = useMemo(() => {
    let amt: bigint;
    try {
      amt = BigInt(amount || "0");
    } catch {
      return undefined;
    }
    return amt * ETH_TO_CREDIT;
  }, [amount]);

  async function handleBuy() {
    let amt: bigint;
    try {
      amt = BigInt(amount || "0");
    } catch {
      setFormError("Amount must be a whole number of credits");
      return;
    }
    if (amt <= 0n) {
      setFormError("Enter how many credits to buy");
      return;
    }
    if (cost === undefined) {
      setFormError("Credit price is still loading — try again in a moment");
      return;
    }
    const err = await buy.submit("buyCredits", [amt], cost);
    setFormError(err);
  }

  async function handleSign(action: TripAction) {
    setPayload(null);

    if (!address) {
      setFormError("Connect your wallet first");
      return;
    }
    if (!moveChainAddress || !isAddress(moveChainAddress)) {
      setFormError("Set VITE_MOVECHAIN_ADDRESS in frontend/.env");
      return;
    }

    const operator_ = onTrip && tripOperator !== undefined ?
      tripOperator : selectedOperator;

    if (!isAddress(operator_)) {
      setFormError("Choose an operator first if starting a trip");
      return;
    }

    try {
      const { data: nonce } = await refetchNonce();
      if (nonce === undefined) {
        setFormError("Could not read your nonce from the contract");
        return;
      }
      const deadline = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS);
      const operator = operator_ as `0x${string}`;

      const signature = await signTypedDataAsync({
        domain: buildDomain(targetChain.id, moveChainAddress),
        types: tripAuthTypes,
        primaryType: "TripAuth",
        message: {
          rider: address,
          operator,
          action,
          nonce: nonce as bigint,
          deadline,
        },
      });

      setPayload({
        rider: address,
        operator,
        action,
        nonce: (nonce as bigint).toString(),
        deadline: deadline.toString(),
        signature,
      });
      void refetchOnTrip();
    } catch (e) {
      setFormError(e instanceof Error ? e.message/*.split("\n")[0]*/ : "Signing failed");
    }
  }

  return (
    <section className="card">
      <h2>Rider</h2>
      <p className="muted">
        Top up credits online, then sign a trip authorization offline. Show the QR code
        to the operator — they submit it on-chain. You do not need an internet
        connection to start a trip.
      </p>

      <div className="status-line">
        <span>
          Credit balance:{" "}
          <strong>{(balance ?? 0n).toString()}</strong>
        </span>
        <span>
          Trip status:{" "}
          <strong>{onTrip ? "on a trip" : "idle"}</strong>
        </span>
      </div>

      <div className="operator-list">
        <h3>1 · Top up credits</h3>
        <div className="row">
          <label htmlFor="amount">Credits to buy</label>
          <div className="field" style={{ maxWidth: 200 }}>
            <input
              id="amount"
              inputMode="numeric"
              placeholder="e.g. 10"
              value={amount}
              onChange={(e) => setAmount(e.target.value.trim())}
            />
          </div>
          <button type="button" disabled={!isConnected || buy.busy} onClick={handleBuy}>
            Buy credits
          </button>
        </div>
        {cost !== undefined && amount && (
          <p className="muted">Cost: {formatEther(cost)} ETH</p>
        )}
      </div>

      <div className="operator-list">
        <h3>2 · Start a trip</h3>
        {!onTrip ? (
          <div>
            <div className="row">
              <div className="field">
                <select
                  id="op-select"
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                >
                  <option value="">Select operator…</option>
                  {operators.map((op) => (
                    <option key={op.address} value={op.address}>
                      {(op.name || "Unnamed operator")} · {op.price.toString()} credits
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <button type="button" onClick={() => void handleSign(ACTION_START)}>
                Sign
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="row">
              <div className="field">
                <label htmlFor="op-select">
                  Stop your trip
                  {currentOperatorName ? ` with ${currentOperatorName}` : ""}
                </label>
              </div>
            </div>
            <div className="row">
              <button type="button" onClick={() => void handleSign(ACTION_STOP)}>
                Sign &amp; generate QR
              </button>
            </div>
          </div>
        )}
      </div>

      {payload && (
        <div className="qr-box">
          <h3>{actionLabel(payload.action)} — show this to the operator</h3>
          <div className="qr-frame">
            <QRCodeSVG value={encodeTripPayload(payload)} size={220} level="M" />
          </div>
          <p className="muted">
            Valid until {formatDeadline(payload.deadline)} · nonce {payload.nonce}
          </p>
          <details>
            <summary className="muted">Show raw payload</summary>
            <p className="mono">{encodeTripPayload(payload)}</p>
          </details>
        </div>
      )}

      {formError && <p className="error">{formError}</p>}
      {buy.busy && <p className="muted">Waiting for wallet / confirmation…</p>}
      <TxStatus hash={buy.txHash} error={buy.writeError} />
    </section>
  );
}
