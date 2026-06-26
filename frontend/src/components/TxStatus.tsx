import { txExplorerUrl } from "../config";

export function TxStatus({
  hash,
  error,
}: {
  hash?: `0x${string}`;
  error?: Error | null;
}) {
  if (error) {
    return <p className="error">{error.message}</p>;
  }
  if (hash) {
    const url = txExplorerUrl(hash);
    return (
      <p className="success">
        Tx:{" "}
        {url ? (
          <a className="mono" href={url} target="_blank" rel="noreferrer">
            {hash}
          </a>
        ) : (
          <span className="mono">{hash}</span>
        )}
      </p>
    );
  }
  return null;
}
