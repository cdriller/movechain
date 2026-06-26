// Read / write GitHub Environment variables for contract state.
//
// TripCredits lives only on the production environment. Branch environments
// store MoveChain address + bytecode hash only.
//
//   node scripts/ci-env-vars.mjs get-json --env NAME [--scope branch|production]
//   node scripts/ci-env-vars.mjs set --env NAME [--scope branch|production]
//   node scripts/ci-env-vars.mjs promote --source SRC --target production
import { execSync } from "node:child_process";

const BRANCH_KEYS = ["MOVECHAIN_ADDRESS", "MOVECHAIN_BYTECODE_HASH"];
const PRODUCTION_KEYS = [
  "MOVECHAIN_ADDRESS",
  "TRIPCREDITS_ADDRESS",
  "MOVECHAIN_BYTECODE_HASH",
  "TRIPCREDITS_BYTECODE_HASH",
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function keysForScope(scope) {
  return scope === "branch" ? BRANCH_KEYS : PRODUCTION_KEYS;
}

function getVar(env, name) {
  try {
    return execSync(`gh variable get "${name}" --env "${env}"`, {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function setVar(env, name, value) {
  execSync(`gh variable set "${name}" --env "${env}" --body "${value}"`, {
    stdio: "inherit",
  });
}

const command = process.argv[2];

if (command === "get-json") {
  const env = arg("--env");
  const scope = arg("--scope") ?? (env === "production" ? "production" : "branch");
  if (!env) {
    console.error("Usage: node scripts/ci-env-vars.mjs get-json --env NAME [--scope branch|production]");
    process.exit(1);
  }
  const vars = Object.fromEntries(
    keysForScope(scope).map((key) => [key, getVar(env, key)]),
  );
  console.log(JSON.stringify(vars));
  process.exit(0);
}

if (command === "set") {
  const env = arg("--env");
  const scope = arg("--scope") ?? (env === "production" ? "production" : "branch");
  if (!env) {
    console.error("Usage: node scripts/ci-env-vars.mjs set --env NAME [--scope branch|production]");
    process.exit(1);
  }

  const branchMapping = {
    MOVECHAIN_ADDRESS: process.env.movechain_address ?? process.env.MOVECHAIN_ADDRESS,
    MOVECHAIN_BYTECODE_HASH:
      process.env.movechain_hash ?? process.env.MOVECHAIN_BYTECODE_HASH,
  };

  const productionMapping = {
    ...branchMapping,
    TRIPCREDITS_ADDRESS:
      process.env.tripcredits_address ?? process.env.TRIPCREDITS_ADDRESS,
    TRIPCREDITS_BYTECODE_HASH:
      process.env.tripcredits_hash ?? process.env.TRIPCREDITS_BYTECODE_HASH,
  };

  const mapping = scope === "branch" ? branchMapping : productionMapping;

  for (const [key, value] of Object.entries(mapping)) {
    if (!value) {
      console.error(`Missing value for ${key}`);
      process.exit(1);
    }
    setVar(env, key, value);
  }

  console.log(`Updated ${scope} environment variables on ${env}`);
  process.exit(0);
}

if (command === "promote") {
  const source = arg("--source");
  const target = arg("--target") ?? "production";
  if (!source) {
    console.error("Usage: node scripts/ci-env-vars.mjs promote --source SRC [--target production]");
    process.exit(1);
  }

  for (const key of BRANCH_KEYS) {
    const value = getVar(source, key);
    if (!value) {
      console.error(`Source environment ${source} is missing ${key}`);
      process.exit(1);
    }
    setVar(target, key, value);
  }

  console.log(`Promoted MoveChain variables from ${source} to ${target}`);
  process.exit(0);
}

console.error("Unknown command. Use get-json, set, or promote.");
process.exit(1);
