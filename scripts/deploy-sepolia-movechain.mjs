// Redeploys ONLY MoveChain to Sepolia against the existing TripCredits, then:
//   1. verifies the new MoveChain on Etherscan
//   2. re-points the existing TripCredits.platform at the new MoveChain (in-module)
//   3. regenerates the frontend ABI from the freshly compiled artifact
//   4. writes the new MoveChain address into frontend/.env.sepolia
//
// The existing TripCredits and its ERC-1155 credit balances are preserved.
// The TripCredits address is taken from ignition/params/sepolia-movechain.json.
//
// Prerequisites: SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY and ETHERSCAN_API_KEY must
// be available (Hardhat keystore or env vars), and the deploying account must be
// the original owner of TripCredits (setPlatform is onlyOwner). You will be
// prompted for the keystore password unless HARDHAT_KEYSTORE_PASSWORD is set.
//
// Usage:  npm run deploy:sepolia:movechain
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARAMS = "ignition/params/sepolia-movechain.json";
const DEPLOYMENT_ID = "sepolia-movechain";
const DEPLOYMENTS = `ignition/deployments/${DEPLOYMENT_ID}/deployed_addresses.json`;
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

function updateFrontendEnv(address) {
  let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  content = upsertEnv(content, "VITE_CHAIN", "sepolia");
  content = upsertEnv(content, "VITE_MOVECHAIN_ADDRESS", address);
  writeFileSync(ENV_FILE, content);
  console.log(`\nUpdated ${ENV_FILE}:`);
  console.log(`  VITE_MOVECHAIN_ADDRESS=${address}`);
  console.log(`  VITE_CHAIN=sepolia`);
}

run(
  `npx hardhat ignition deploy ignition/modules/MoveChainOnly.ts --network sepolia --parameters ${PARAMS} --deployment-id ${DEPLOYMENT_ID} --reset --verify`,
);
run("node scripts/gen-abi.mjs");

const addresses = JSON.parse(readFileSync(join(root, DEPLOYMENTS), "utf8"));
const moveChain = addresses["MoveChainOnlyModule#MoveChain"];
if (!moveChain) {
  console.error(`Could not find MoveChainOnlyModule#MoveChain in ${DEPLOYMENTS}`);
  process.exit(1);
}

updateFrontendEnv(moveChain);

console.log(`\nDone. New MoveChain deployed + verified at ${moveChain}.`);
console.log("Existing TripCredits preserved and re-pointed to the new MoveChain.");
console.log("Run the frontend against Sepolia with:  cd frontend && npm run sepolia");
