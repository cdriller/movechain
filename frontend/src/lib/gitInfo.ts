export function gitCommitInfo(): {
  sha: string;
  shortSha: string;
  url?: string;
} | null {
  const sha = import.meta.env.VITE_GIT_SHA?.trim();
  if (!sha) return null;

  const repoUrl = import.meta.env.VITE_GIT_REPO_URL?.trim().replace(/\/$/, "");
  const url = repoUrl
    ? repoUrl.includes("gitlab")
      ? `${repoUrl}/-/commit/${sha}`
      : `${repoUrl}/commit/${sha}`
    : undefined;

  return { sha, shortSha: sha.slice(0, 7), url };
}
