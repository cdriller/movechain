// Prints a stable sha256 of a contract's compiled deployedBytecode.
// Used by CI change-detection to decide whether a contract needs a redeploy.
//
// The deployedBytecode changes whenever the source, compiler version or
// settings change, so its hash is a reliable "did the compiled output change"
// signal. We deliberately do NOT compare against on-chain code: OpenZeppelin's
// EIP712 stores name/version as immutables that are baked into the on-chain
// runtime code but appear as zero placeholders in the artifact, so a direct
// on-chain comparison would always mismatch.
//
// Usage:  node scripts/ci-hash.mjs MoveChain
//         node scripts/ci-hash.mjs TripCredits
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const name = process.argv[2];
if (!name) {
  console.error("Usage: node scripts/ci-hash.mjs <ContractName>");
  process.exit(1);
}

const artifactPath = join(root, `artifacts/contracts/${name}.sol/${name}.json`);

let artifact;
try {
  artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
} catch {
  console.error(
    `Artifact not found at ${artifactPath}. Run \`npx hardhat compile\` first.`,
  );
  process.exit(1);
}

const dep = artifact.deployedBytecode;
const code = typeof dep === "string" ? dep : dep?.object;
if (!code) {
  console.error(`No deployedBytecode found in ${artifactPath}`);
  process.exit(1);
}

console.log(createHash("sha256").update(code).digest("hex"));
