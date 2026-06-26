// One-shot helper for local development:
//   1. checks the hardhat node is running on 127.0.0.1:8545
//   2. compiles contracts + regenerates the frontend ABI
//   3. deploys MoveChain (+ TripCredits) to the local chain
//   4. writes the deployed MoveChain address into frontend/.env
//
// Prerequisite: start the node in another terminal first:  npx hardhat node
// Usage:  npm run deploy:local
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 31337;
const PARAMS = "ignition/params/localhost.json";
const DEPLOYMENTS = `ignition/deployments/chain-${CHAIN_ID}/deployed_addresses.json`;
const ENV_FILE = join(root, "frontend/.env.local");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: ["pipe", "inherit", "inherit"], input: "y\n" });
}

async function assertNodeRunning() {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    const { result } = await res.json();
    if (parseInt(result, 16) !== CHAIN_ID) {
      console.warn(`Warning: node chainId is ${parseInt(result, 16)}, expected ${CHAIN_ID}`);
    }
  } catch {
    console.error(
      `\nNo hardhat node reachable at ${RPC_URL}.\n` +
        `Start it in another terminal first:\n\n  npx hardhat node\n`,
    );
    process.exit(1);
  }
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  return (content.trimEnd() + "\n" + line + "\n").replace(/^\n/, "");
}

function updateFrontendEnv(moveChain, tripCredits) {
  let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  content = upsertEnv(content, "VITE_MOVECHAIN_ADDRESS", moveChain);
  content = upsertEnv(content, "VITE_TRIPCREDITS_ADDRESS", tripCredits);
  content = upsertEnv(content, "VITE_CHAIN", "local");
  content = upsertEnv(content, "VITE_RPC_URL", RPC_URL);
  writeFileSync(ENV_FILE, content);
  console.log(`\nUpdated ${ENV_FILE}:`);
  console.log(`  VITE_MOVECHAIN_ADDRESS=${moveChain}`);
  console.log(`  VITE_TRIPCREDITS_ADDRESS=${tripCredits}`);
  console.log(`  VITE_CHAIN=local`);
  console.log(`  VITE_RPC_URL=${RPC_URL}`);
}

await assertNodeRunning();

run("npx hardhat compile");
run("node scripts/gen-abi.mjs");
run(`npx hardhat ignition deploy ignition/modules/MoveChain.ts --network localhost --parameters ${PARAMS} --reset`);

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

console.log(`\nDone. MoveChain deployed at ${moveChain}.`);
console.log("Start the frontend with:  cd frontend && npm run dev");
