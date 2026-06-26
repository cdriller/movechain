import { useState } from "react";
import { isAddress } from "viem";
import { TxStatus } from "../components/TxStatus";
import { useOperators } from "../lib/useOperators";
import { useMoveChainWrite } from "../lib/useMoveChainWrite";

export function AdminView() {
  const { operators, isLoading, refetch } = useOperators();
  const { submit, txHash, writeError, busy } = useMoveChainWrite(() =>
    void refetch(),
  );

  const [operatorAddress, setOperatorAddress] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAdd() {
    if (!isAddress(operatorAddress)) {
      setFormError("Invalid operator address");
      return;
    }
    if (operatorName.trim().length === 0) {
      setFormError("Operator name is required");
      return;
    }
    let priceValue: bigint;
    try {
      priceValue = BigInt(price || "0");
    } catch {
      setFormError("Price must be a whole number of credits");
      return;
    }

    const err = await submit("addOperator", [
      operatorAddress,
      priceValue,
      operatorName.trim(),
    ]);
    setFormError(err);
  }

  async function handleSetName() {
    if (!isAddress(operatorAddress)) {
      setFormError("Invalid operator address");
      return;
    }
    if (operatorName.trim().length === 0) {
      setFormError("Operator name is required");
      return;
    }
    const err = await submit("setOperatorName", [
      operatorAddress,
      operatorName.trim(),
    ]);
    setFormError(err);
  }

  async function handleRemove() {
    if (!isAddress(operatorAddress)) {
      setFormError("Invalid operator address");
      return;
    }
    let error = await submit("removeOperator", [operatorAddress]);
    setFormError(error);
  }

  return (
    <section className="card">
      <h2>Admin</h2>
      <p className="muted">
        Whitelist mobility operators and set their flat trip price (in credits).
        Use the wallet that deployed MoveChain (the contract owner).
      </p>

      <div className="row">
        <div className="field">
          <label htmlFor="operator-name">Operator name</label>
          <input
            id="operator-name"
            placeholder="e.g. Metro Transit"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
          />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="operator">Operator wallet address</label>
          <input
            id="operator"
            placeholder="0x…"
            value={operatorAddress}
            onChange={(e) => setOperatorAddress(e.target.value.trim())}
          />
        </div>
        <div className="field" style={{ maxWidth: 160 }}>
          <label htmlFor="price">Trip price (credits)</label>
          <input
            id="price"
            inputMode="numeric"
            placeholder="e.g. 3"
            value={price}
            onChange={(e) => setPrice(e.target.value.trim())}
          />
        </div>
      </div>
      <div className="row">
        <button
          type="button"
          disabled={busy}
          onClick={handleAdd}
        >
          Add / whitelist operator
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={handleSetName}
        >
          Update name
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={handleRemove}
        >
          Remove operator
        </button>
        <button
          type="button"
          className="secondary"
          disabled={isLoading}
          onClick={() => void refetch()}
        >
          Refresh
        </button>
      </div>

      <div className="operator-list">
        <h3>Whitelisted operators</h3>
        { isLoading ? (
          <p className="muted">Loading…</p>
        ) : operators.length === 0 ? (
          <p className="muted">No whitelisted operators on chain yet.</p>
        ) : (
          <ul>
            {operators.map((op) => (
              <li key={op.address}>
                <strong>{op.name || "Unnamed operator"}</strong>
                <span className="mono">{op.address}</span>
                <span className="muted">
                  trip price:{" "}
                  {op.price === 0n
                    ? "not set"
                    : `${op.price.toString()} credits`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formError && <p className="error">{formError}</p>}
      {busy && <p className="muted">Waiting for wallet / confirmation…</p>}
      <TxStatus hash={txHash} error={writeError} />
    </section>
  );
}
