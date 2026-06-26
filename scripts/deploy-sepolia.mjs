// One-shot helper for deploying to Sepolia:
//   1. deploys MoveChain (+ TripCredits) fresh to Sepolia and verifies on Etherscan
//   2. regenerates the frontend ABI from the freshly compiled artifact
//   3. writes the new MoveChain address into frontend/.env.sepolia
//
// Prerequisites: SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY and ETHERSCAN_API_KEY must
// be available (Hardhat keystore or env vars). You will be prompted for the
// keystore password unless HARDHAT_KEYSTORE_PASSWORD is set.
//
// Usage:  npm run deploy:sepolia
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHAIN_ID = 11155111;
const PARAMS = "ignition/params/sepolia.json";
const DEPLOYMENTS = `ignition/deployments/chain-${CHAIN_ID}/deployed_addresses.json`;
const ENV_FILE = join(root, "frontend/.env.sepolia");

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  // Inherit stdio so the keystore password prompt and Ignition's
  // reset/deploy confirmations can be answered interactively.
  execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  return (content.trimEnd() + "\n" + line + "\n").replace(/^\n/, "");
}

function updateFrontendEnv(moveChain, tripCredits) {
  let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  content = upsertEnv(content, "VITE_CHAIN", "sepolia");
  content = upsertEnv(content, "VITE_MOVECHAIN_ADDRESS", moveChain);
  content = upsertEnv(content, "VITE_TRIPCREDITS_ADDRESS", tripCredits);
  writeFileSync(ENV_FILE, content);
  console.log(`\nUpdated ${ENV_FILE}:`);
  console.log(`  VITE_MOVECHAIN_ADDRESS=${moveChain}`);
  console.log(`  VITE_TRIPCREDITS_ADDRESS=${tripCredits}`);
  console.log(`  VITE_CHAIN=sepolia`);
}

run(
  `npx hardhat ignition deploy ignition/modules/MoveChain.ts --network sepolia --parameters ${PARAMS} --reset --verify`,
);
run("node scripts/gen-abi.mjs");

const addresses = JSON.parse(readFileSync(join(root, DEPLOYMENTS), "utf8"));
const moveChain = addresses["MoveChainModule#MoveChain"];
const tripCredits = addresses["MoveChainModule#TripCredits"];
if (!moveChain) {
  console.error(`Could not find MoveChainModule#MoveChain in ${DEPLOYMENTS}`);
  process.exit(1);
}
if (!tripCredits) {
  console.error(`Could not find MoveChainModule#TripCredits in ${DEPLOYMENTS}`);
  process.exit(1);
}

updateFrontendEnv(moveChain, tripCredits);

console.log(`\nDone. MoveChain deployed + verified at ${moveChain}.`);
console.log("Run the frontend against Sepolia with:  cd frontend && npm run sepolia");
