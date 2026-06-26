import { execSync } from "node:child_process";

function gitSha(): string {
  if (process.env.VITE_GIT_SHA) return process.env.VITE_GIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function gitRemoteWebUrl(): string {
  if (process.env.VITE_GIT_REPO_URL) return process.env.VITE_GIT_REPO_URL;
  try {
    let url = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    }).trim();
    if (url.startsWith("git@")) {
      const [host, path] = url.slice(4).split(":");
      url = `https://${host}/${path}`;
    }
    return url.replace(/\.git$/, "");
  } catch {
    return "";
  }
}

process.env.VITE_GIT_SHA ??= gitSha();
process.env.VITE_GIT_REPO_URL ??= gitRemoteWebUrl();
