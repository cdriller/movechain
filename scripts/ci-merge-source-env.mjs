// Resolve the sanitized GitHub Environment name for a merge commit's source branch.
// Prints the env name on stdout, or nothing when not merged via pull request.
//
// Usage: node scripts/ci-merge-source-env.mjs
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;

if (!repo || !sha) {
  process.exit(0);
}

let headRef = "";
try {
  const json = execSync(
    `gh api "repos/${repo}/commits/${sha}/pulls" --jq '.[0].head.ref // empty'`,
    { encoding: "utf8" },
  ).trim();
  headRef = json;
} catch {
  process.exit(0);
}

if (!headRef || headRef === "main") {
  process.exit(0);
}

const envName = execSync(`node scripts/branch-env-name.mjs "${headRef}"`, {
  cwd: root,
  encoding: "utf8",
}).trim();

process.stdout.write(envName);
