// Decide whether to deploy, promote, or skip contract updates.
//
// TripCredits is shared across all environments — only the production
// environment stores TRIPCREDITS_* variables. Branch environments store
// MoveChain only.
//
// Branch / MR:
//   node scripts/ci-plan.mjs --role branch
//   Env: MOVECHAIN_ADDRESS, MOVECHAIN_BYTECODE_HASH (branch)
//        SHARED_TRIPCREDITS_ADDRESS, SHARED_TRIPCREDITS_BYTECODE_HASH (production)
//
// Production (optional source branch environment for merge promotion):
//   node scripts/ci-plan.mjs --role production --source-env feature-login
//   Env: production MOVECHAIN_* / TRIPCREDITS_*
//        SOURCE_MOVECHAIN_* (branch; MoveChain only)
//
// Writes action + deploy_mode to GITHUB_OUTPUT when set.
import { appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const role = arg("--role");
const sourceEnv = arg("--source-env");

if (role !== "branch" && role !== "production") {
  console.error("Usage: node scripts/ci-plan.mjs --role <branch|production> [--source-env NAME]");
  process.exit(1);
}

function snapshot(prefix = "") {
  const p = prefix ? `${prefix}_` : "";
  return {
    movechainAddress: process.env[`${p}MOVECHAIN_ADDRESS`] ?? "",
    movechainHash: process.env[`${p}MOVECHAIN_BYTECODE_HASH`] ?? "",
    tripcreditsAddress: process.env[`${p}TRIPCREDITS_ADDRESS`] ?? "",
    tripcreditsHash: process.env[`${p}TRIPCREDITS_BYTECODE_HASH`] ?? "",
  };
}

function compiledHash(contract) {
  return execSync(`node scripts/ci-hash.mjs ${contract}`, {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

function contractChanged(compiled, address, storedHash) {
  if (!address || !storedHash) return true;
  return compiled !== storedHash;
}

function branchPlan(branch, shared, mcCompiled, tcCompiled) {
  const mcChanged = contractChanged(
    mcCompiled,
    branch.movechainAddress,
    branch.movechainHash,
  );
  const tcChangedGlobally = contractChanged(
    tcCompiled,
    shared.tripcreditsAddress,
    shared.tripcreditsHash,
  );

  if (tcChangedGlobally) {
    return {
      action: "blocked",
      deploy_mode: "none",
      movechain_changed: mcChanged,
      tripcredits_changed: true,
      tripcredits_blocked: true,
      promote_scope: "",
    };
  }

  return {
    action: mcChanged ? "deploy" : "none",
    deploy_mode: mcChanged ? "movechain" : "none",
    movechain_changed: mcChanged,
    tripcredits_changed: false,
    tripcredits_blocked: false,
    promote_scope: "",
  };
}

function productionPlan(target, source, mcCompiled, tcCompiled, hasSource) {
  const tcProd = contractChanged(
    tcCompiled,
    target.tripcreditsAddress,
    target.tripcreditsHash,
  );

  if (tcProd) {
    return {
      action: "deploy",
      deploy_mode: "full",
      movechain_changed: true,
      tripcredits_changed: true,
      tripcredits_blocked: false,
      promote_scope: "",
    };
  }

  const mcProd = contractChanged(
    mcCompiled,
    target.movechainAddress,
    target.movechainHash,
  );

  if (!hasSource) {
    return {
      action: mcProd ? "deploy" : "none",
      deploy_mode: mcProd ? "movechain" : "none",
      movechain_changed: mcProd,
      tripcredits_changed: false,
      tripcredits_blocked: false,
      promote_scope: "",
    };
  }

  const mcSource = contractChanged(
    mcCompiled,
    source.movechainAddress,
    source.movechainHash,
  );

  if (mcProd && mcSource) {
    return {
      action: "deploy",
      deploy_mode: "movechain",
      movechain_changed: true,
      tripcredits_changed: false,
      tripcredits_blocked: false,
      promote_scope: "",
    };
  }

  if (mcProd && !mcSource) {
    return {
      action: "promote",
      deploy_mode: "none",
      movechain_changed: true,
      tripcredits_changed: false,
      tripcredits_blocked: false,
      promote_scope: "movechain",
    };
  }

  return {
    action: "none",
    deploy_mode: "none",
    movechain_changed: false,
    tripcredits_changed: false,
    tripcredits_blocked: false,
    promote_scope: "",
  };
}

const mcCompiled = compiledHash("MoveChain");
const tcCompiled = compiledHash("TripCredits");

const plan =
  role === "branch"
    ? branchPlan(snapshot(), snapshot("SHARED"), mcCompiled, tcCompiled)
    : productionPlan(
        snapshot(),
        snapshot("SOURCE"),
        mcCompiled,
        tcCompiled,
        Boolean(sourceEnv),
      );

console.log("Plan:", JSON.stringify(plan, null, 2));
console.log(`Compiled MoveChain hash:    ${mcCompiled}`);
console.log(`Compiled TripCredits hash:  ${tcCompiled}`);

if (process.env.GITHUB_OUTPUT) {
  const lines = [
    `action=${plan.action}`,
    `deploy_mode=${plan.deploy_mode}`,
    `movechain_changed=${plan.movechain_changed}`,
    `tripcredits_changed=${plan.tripcredits_changed}`,
    `tripcredits_blocked=${plan.tripcredits_blocked}`,
    `promote_scope=${plan.promote_scope}`,
    `movechain_hash=${mcCompiled}`,
    `tripcredits_hash=${tcCompiled}`,
  ];
  appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
}

if (plan.action === "blocked") {
  console.error(
    "TripCredits.sol changed. TripCredits is shared across all environments " +
      "and can only be redeployed on merge to main.",
  );
  process.exit(1);
}
