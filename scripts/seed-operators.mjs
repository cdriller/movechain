// Idempotently (re-)seeds the operator whitelist onto a MoveChain deployment.
//
// A MoveChain redeploy lands on a new address and starts with an empty operator
// whitelist, admin set, prices and names. This script restores the operators
// from ignition/params/operators.sepolia.json so the system is usable again
// without any manual step.
//
// It is idempotent: operators already whitelisted on-chain are skipped, so it is
// safe to run repeatedly. The zero-address placeholder in the params file is
// ignored, so an unconfigured list is a no-op.
//
// The signing key must be one of MoveChain's admins (addOperator is onlyAdmin).
//
// Usage:
//   SEPOLIA_PRIVATE_KEY=0x... MOVECHAIN_ADDRESS=0x... node scripts/seed-operators.mjs
//   node scripts/seed-operators.mjs 0xMoveChainAddress      (address as argument)
//
// Env:
//   ADMIN_PRIVATE_KEY  admin key for addOperator (falls back to SEPOLIA_PRIVATE_KEY)
//   SEPOLIA_RPC_URL    Sepolia RPC (falls back to a public endpoint)
//   MOVECHAIN_ADDRESS  target MoveChain (or pass as argv[2])
import {
  createWalletClient,
  createPublicClient,
  http,
  getAddress,
  isAddress,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(root, "ignition/params/operators.sepolia.json");
const ZERO = "0x0000000000000000000000000000000000000000";

function normalizePrivateKey(raw) {
  const trimmed = raw.trim();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "Invalid private key: expected 32-byte hex (with or without 0x prefix).",
    );
  }
  return `0x${hex}`;
}

const moveChain = process.argv[2] ?? process.env.MOVECHAIN_ADDRESS;
if (!moveChain || !isAddress(moveChain)) {
  throw new Error(
    "Pass the MoveChain address as MOVECHAIN_ADDRESS env or argv[2].",
  );
}

const rawPk = process.env.ADMIN_PRIVATE_KEY ?? process.env.SEPOLIA_PRIVATE_KEY;
if (!rawPk) {
  throw new Error("Set ADMIN_PRIVATE_KEY (or SEPOLIA_PRIVATE_KEY) to an admin key.");
}
const pk = normalizePrivateKey(rawPk);

const rpc =
  process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

let config;
try {
  config = JSON.parse(readFileSync(CONFIG, "utf8"));
} catch {
  console.log(`No operator config at ${CONFIG}; nothing to seed.`);
  process.exit(0);
}

const operators = (config.operators ?? []).filter(
  (op) => isAddress(op.address) && getAddress(op.address) !== ZERO,
);

if (operators.length === 0) {
  console.log("No real operators configured (only placeholders); nothing to seed.");
  process.exit(0);
}

const abi = parseAbi([
  "function addOperator(address operator, uint256 _price, string _name)",
  "function getOperator(address operator) view returns ((bool whitelisted, uint256 price, uint256 totalEarningsInEth, string name))",
]);

const account = privateKeyToAccount(pk);
const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
const pub = createPublicClient({ chain: sepolia, transport: http(rpc) });

console.log(`Seeding ${operators.length} operator(s) onto MoveChain ${moveChain}`);
console.log(`Admin: ${account.address}`);

for (const op of operators) {
  const address = getAddress(op.address);
  const price = BigInt(op.price);
  const name = op.name ?? "";

  const existing = await pub.readContract({
    address: moveChain,
    abi,
    functionName: "getOperator",
    args: [address],
  });

  if (existing.whitelisted) {
    console.log(`  - ${address} (${name}) already whitelisted, skipping`);
    continue;
  }

  console.log(`  + adding ${address} (${name}) price=${price}`);
  const hash = await wallet.writeContract({
    address: moveChain,
    abi,
    functionName: "addOperator",
    args: [address, price, name],
  });
  await pub.waitForTransactionReceipt({ hash });
  console.log(`    done (tx ${hash})`);
}

console.log("Operator seeding complete.");
