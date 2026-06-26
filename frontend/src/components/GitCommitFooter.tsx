import { gitCommitInfo } from "../lib/gitInfo";

export function GitCommitFooter() {
  const commit = gitCommitInfo();
  if (!commit) return null;

  return (
    <footer className="app-footer">
      {commit.url ? (
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
      )}
    </footer>
  );
}
