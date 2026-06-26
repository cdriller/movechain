// Non-interactive Sepolia deploy for CI.
//
// Two modes:
//   --mode movechain   Redeploys ONLY MoveChain against the existing TripCredits
//                       (the common case; TripCredits + credit balances preserved).
//   --mode full        Deploys fresh TripCredits + MoveChain (destructive: wipes
//                       all rider credit balances). Gated behind a manual approval
//                       in the workflow.
//
// After deploying it re-seeds the operator whitelist (scripts/seed-operators.mjs)
// and emits GitHub Actions outputs (and prints them) so the workflow can persist
// the new address/hashes as repository variables and hand the address to the
// frontend build:
//   movechain_address, tripcredits_address, movechain_hash, tripcredits_hash
//
// Required env: SEPOLIA_PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY.
// Optional env: TRIPCREDITS_ADDRESS (movechain mode; falls back to the committed
//               ignition/params/sepolia-movechain.json value).
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const modeFlag = process.argv.indexOf("--mode");
const mode = modeFlag !== -1 ? process.argv[modeFlag + 1] : undefined;
if (mode !== "movechain" && mode !== "full") {
  console.error("Usage: node scripts/ci-deploy.mjs --mode <movechain|full>");
  process.exit(1);
}

for (const v of ["SEPOLIA_PRIVATE_KEY", "SEPOLIA_RPC_URL", "ETHERSCAN_API_KEY"]) {
  if (!process.env[v]) {
    console.error(`Missing required env var: ${v}`);
    process.exit(1);
  }
}

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  // Pipe "y\n" so Ignition's "confirm deploy to <network>" prompt is auto-answered.
  execSync(cmd, { cwd: root, stdio: ["pipe", "inherit", "inherit"], input: "y\n", ...opts });
}

function bytecodeHash(name) {
  const path = join(root, `artifacts/contracts/${name}.sol/${name}.json`);
  const artifact = JSON.parse(readFileSync(path, "utf8"));
  const dep = artifact.deployedBytecode;
  const code = typeof dep === "string" ? dep : dep?.object;
  return createHash("sha256").update(code).digest("hex");
}

function readAddresses(deploymentId) {
  const path = join(
    root,
    `ignition/deployments/${deploymentId}/deployed_addresses.json`,
  );
  return JSON.parse(readFileSync(path, "utf8"));
}

const runId = process.env.GITHUB_RUN_ID ?? String(Date.now());
const deploymentId = `ci-${mode}-${runId}`;

// Compile first so we can compute artifact hashes regardless of mode.
run("npx hardhat compile");
const movechainHash = bytecodeHash("MoveChain");
const tripcreditsHash = bytecodeHash("TripCredits");

let moveChainAddress;
let tripCreditsAddress;

if (mode === "full") {
  const params = "ignition/params/sepolia.json";
  run(
    `npx hardhat ignition deploy ignition/modules/MoveChain.ts ` +
      `--network sepolia --parameters ${params} ` +
      `--deployment-id ${deploymentId} --verify`,
  );
  const addresses = readAddresses(deploymentId);
  moveChainAddress = addresses["MoveChainModule#MoveChain"];
  tripCreditsAddress = addresses["MoveChainModule#TripCredits"];
} else {
  // movechain: reuse admins from the committed params, but take TripCredits from
  // env (the current address persisted in CI) so we never depend on a stale file.
  const committed = JSON.parse(
    readFileSync(join(root, "ignition/params/sepolia-movechain.json"), "utf8"),
  );
  const base = committed.MoveChainOnlyModule ?? {};
  tripCreditsAddress = process.env.TRIPCREDITS_ADDRESS ?? base.tripCredits;
  if (!tripCreditsAddress) {
    console.error("No TripCredits address (set TRIPCREDITS_ADDRESS or the params file).");
    process.exit(1);
  }

  const paramsObj = {
    MoveChainOnlyModule: {
      admin1: base.admin1,
      admin2: base.admin2,
      admin3: base.admin3,
      tripCredits: tripCreditsAddress,
    },
  };
  const tmp = mkdtempSync(join(tmpdir(), "movechain-params-"));
  const paramsPath = join(tmp, "params.json");
  writeFileSync(paramsPath, JSON.stringify(paramsObj, null, 2));

  run(
    `npx hardhat ignition deploy ignition/modules/MoveChainOnly.ts ` +
      `--network sepolia --parameters ${paramsPath} ` +
      `--deployment-id ${deploymentId} --verify`,
  );
  const addresses = readAddresses(deploymentId);
  moveChainAddress = addresses["MoveChainOnlyModule#MoveChain"];
}

if (!moveChainAddress) {
  console.error("Could not determine the deployed MoveChain address.");
  process.exit(1);
}

console.log(`\nDeployed MoveChain at ${moveChainAddress}`);
console.log(`TripCredits at ${tripCreditsAddress}`);

// Re-seed operators (idempotent). A redeploy wipes the on-chain whitelist.
run(`node scripts/seed-operators.mjs ${moveChainAddress}`, {
  env: { ...process.env, MOVECHAIN_ADDRESS: moveChainAddress },
});

const outputs = {
  movechain_address: moveChainAddress,
  tripcredits_address: tripCreditsAddress,
  movechain_hash: movechainHash,
  tripcredits_hash: tripcreditsHash,
};

console.log("\nOutputs:");
for (const [k, v] of Object.entries(outputs)) console.log(`  ${k}=${v}`);

if (process.env.GITHUB_OUTPUT) {
  const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v}`).join("\n");
  appendFileSync(process.env.GITHUB_OUTPUT, lines + "\n");
}
