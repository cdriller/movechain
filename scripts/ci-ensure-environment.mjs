// Create a GitHub Environment if it does not exist yet.
// Usage: node scripts/ci-ensure-environment.mjs <environment-name>
import { execSync } from "node:child_process";

const name = process.argv[2]?.trim();
if (!name) {
  console.error("Usage: node scripts/ci-ensure-environment.mjs <environment-name>");
  process.exit(1);
}

if (!process.env.GH_TOKEN) {
  console.error("GH_TOKEN is required.");
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error("GITHUB_REPOSITORY is required.");
  process.exit(1);
}

const encoded = encodeURIComponent(name);
execSync(`gh api -X PUT "repos/${repo}/environments/${encoded}"`, {
  stdio: "inherit",
});

console.log(`Environment ready: ${name}`);
