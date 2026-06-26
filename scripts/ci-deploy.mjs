// Non-interactive Sepolia deploy for CI.
//
// Modes:
//   --mode preview    Branch preview: deploy MoveChain only, do NOT call
//                     TripCredits.setPlatform (production stays wired).
//   --mode movechain  Production: redeploy MoveChain + setPlatform on TripCredits.
//   --mode full       Fresh TripCredits + MoveChain (destructive).
//
// After deploying it re-seeds the operator whitelist (scripts/seed-operators.mjs)
// and emits GitHub Actions outputs:
//   movechain_address, tripcredits_address, movechain_hash, tripcredits_hash
//
// Required env: SEPOLIA_PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY.
// Optional env: TRIPCREDITS_ADDRESS (preview/movechain; falls back to params file).
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const modeFlag = process.argv.indexOf("--mode");
const mode = modeFlag !== -1 ? process.argv[modeFlag + 1] : undefined;
const skipVerify = process.argv.includes("--skip-verify");
if (mode !== "preview" && mode !== "movechain" && mode !== "full") {
  console.error(
    "Usage: node scripts/ci-deploy.mjs --mode <preview|movechain|full> [--skip-verify]",
  );
  process.exit(1);
}

for (const v of [
  "SEPOLIA_PRIVATE_KEY",
  "SEPOLIA_RPC_URL",
  ...(skipVerify ? [] : ["ETHERSCAN_API_KEY"]),
]) {
  if (!process.env[v]) {
    console.error(`Missing required env var: ${v}`);
    process.exit(1);
  }
}

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
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

function loadMoveChainOnlyParams() {
  const committed = JSON.parse(
    readFileSync(join(root, "ignition/params/sepolia-movechain.json"), "utf8"),
  );
  const base = committed.MoveChainOnlyModule ?? {};
  const tripCreditsAddress = process.env.TRIPCREDITS_ADDRESS ?? base.tripCredits;
  if (!tripCreditsAddress) {
    console.error("No TripCredits address (set TRIPCREDITS_ADDRESS or the params file).");
    process.exit(1);
  }
  return { base, tripCreditsAddress };
}

function deployMoveChainModule(modulePath, moduleKey, paramsModuleKey, tripCreditsAddress, base) {
  const paramsObj = {
    [paramsModuleKey]: {
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
    `npx hardhat ignition deploy ${modulePath} ` +
      `--network sepolia --parameters ${paramsPath} ` +
      `--deployment-id ${deploymentId}${verifyFlag}`,
  );
  const addresses = readAddresses(deploymentId);
  return addresses[`${moduleKey}#MoveChain`];
}

const runId = process.env.GITHUB_RUN_ID ?? String(Date.now());
const deploymentId = process.env.DEPLOYMENT_ID ?? `ci-${mode}-${runId}`;
const verifyFlag = skipVerify ? "" : " --verify";

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
      `--deployment-id ${deploymentId}${verifyFlag}`,
  );
  const addresses = readAddresses(deploymentId);
  moveChainAddress = addresses["MoveChainModule#MoveChain"];
  tripCreditsAddress = addresses["MoveChainModule#TripCredits"];
} else {
  const { base, tripCreditsAddress: tc } = loadMoveChainOnlyParams();
  tripCreditsAddress = tc;

  if (mode === "preview") {
    moveChainAddress = deployMoveChainModule(
      "ignition/modules/MoveChainPreview.ts",
      "MoveChainPreviewModule",
      "MoveChainPreviewModule",
      tripCreditsAddress,
      base,
    );
  } else {
    moveChainAddress = deployMoveChainModule(
      "ignition/modules/MoveChainOnly.ts",
      "MoveChainOnlyModule",
      "MoveChainOnlyModule",
      tripCreditsAddress,
      base,
    );
  }
}

if (!moveChainAddress) {
  console.error("Could not determine the deployed MoveChain address.");
  process.exit(1);
}

console.log(`\nDeployed MoveChain at ${moveChainAddress}`);
console.log(`TripCredits at ${tripCreditsAddress}`);
if (mode === "preview") {
  console.log("Preview mode: TripCredits.setPlatform was NOT called.");
}

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
