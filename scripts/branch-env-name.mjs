// Map a git branch name to a GitHub Environment name.
// Usage: node scripts/branch-env-name.mjs feature/login
import { createHash } from "node:crypto";

const branch = process.argv[2]?.trim();
if (!branch) {
  console.error("Usage: node scripts/branch-env-name.mjs <branch-name>");
  process.exit(1);
}

if (branch === "main") {
  console.log("production");
  process.exit(0);
}

let name = branch
  .replace(/[^a-zA-Z0-9._-]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^[-_.]+|[-_.]+$/g, "");

if (!name) {
  name = `branch-${createHash("sha256").update(branch).digest("hex").slice(0, 8)}`;
}

console.log(name.slice(0, 100));
