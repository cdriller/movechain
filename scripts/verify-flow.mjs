// Standalone end-to-end check of the operator-signed QR trip flow against a
// local hardhat node. Mirrors the EIP-712 typed data the frontend produces.
//
// Usage: node scripts/verify-flow.mjs [MOVECHAIN_ADDRESS]
//   If no address is passed, it is read from the local Ignition deployment.
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { readFileSync, existsSync } from "node:fs";

const DEPLOYMENTS = "ignition/deployments/chain-31337/deployed_addresses.json";

function resolveAddress() {
  if (process.argv[2]) return process.argv[2];
  if (existsSync(DEPLOYMENTS)) {
    const deployed = JSON.parse(readFileSync(DEPLOYMENTS, "utf8"));
    const addr = deployed["MoveChainModule#MoveChain"];
    if (addr) return addr;
  }
  throw new Error(
    "No MoveChain address. Pass it as argv[2] or run `npm run deploy:local` first.",
  );
}

const address = resolveAddress();

const artifact = JSON.parse(
  readFileSync("artifacts/contracts/MoveChain.sol/MoveChain.json", "utf8"),
);
const abi = artifact.abi;

const PK = {
  admin: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  operator: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  rider: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
};

const transport = http("http://127.0.0.1:8545");
const pub = createPublicClient({ chain: hardhat, transport });
const admin = createWalletClient({ account: privateKeyToAccount(PK.admin), chain: hardhat, transport });
const operator = createWalletClient({ account: privateKeyToAccount(PK.operator), chain: hardhat, transport });
const riderAccount = privateKeyToAccount(PK.rider);
const rider = createWalletClient({ account: riderAccount, chain: hardhat, transport });

const PRICE = 3n;

async function wait(hash) {
  await pub.waitForTransactionReceipt({ hash });
}

async function signTripAuth(action, deadline) {
  const nonce = await pub.readContract({ address, abi, functionName: "getNonce", args: [riderAccount.address] });
  const signature = await rider.signTypedData({
    domain: { name: "MoveChain", version: "1", chainId: hardhat.id, verifyingContract: address },
    types: {
      TripAuth: [
        { name: "rider", type: "address" },
        { name: "operator", type: "address" },
        { name: "action", type: "uint8" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "TripAuth",
    message: {
      rider: riderAccount.address,
      operator: operator.account.address,
      action,
      nonce,
      deadline,
    },
  });
  return signature;
}

async function main() {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  console.log("addOperator…");
  await wait(await admin.writeContract({ address, abi, functionName: "addOperator", args: [operator.account.address, PRICE, "Demo Operator"] }));

  const ethToCredit = await pub.readContract({ address, abi, functionName: "getEthToCredit" });
  console.log("buyCredits(10)…");
  await wait(await rider.writeContract({ address, abi, functionName: "buyCredits", args: [10n], value: 10n * ethToCredit }));

  console.log("startTrip with rider signature…");
  const startSig = await signTripAuth(0, deadline);
  await wait(await operator.writeContract({ address, abi, functionName: "startTrip", args: [riderAccount.address, deadline, startSig] }));

  const onTrip = await pub.readContract({ address, abi, functionName: "isOnTrip", args: [riderAccount.address] });
  console.log("isOnTrip:", onTrip);

  console.log("completeTrip with rider signature…");
  const stopSig = await signTripAuth(1, deadline);
  await wait(await operator.writeContract({ address, abi, functionName: "completeTrip", args: [riderAccount.address, deadline, stopSig] }));

  const riderBal = await pub.readContract({ address, abi, functionName: "creditsOf", args: [riderAccount.address] });
  const opBal = await pub.readContract({ address, abi, functionName: "creditsOf", args: [operator.account.address] });
  const stillOnTrip = await pub.readContract({ address, abi, functionName: "isOnTrip", args: [riderAccount.address] });

  console.log("rider credits:", riderBal.toString(), "(expected 7)");
  console.log("operator credits:", opBal.toString(), "(expected 3)");
  console.log("rider still on trip:", stillOnTrip, "(expected false)");

  const ok = riderBal === 7n && opBal === 3n && stillOnTrip === false;
  console.log(ok ? "\nE2E OK: EIP-712 signature verified on-chain, credits settled." : "\nE2E FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e.shortMessage ?? e.message ?? e);
  process.exit(1);
});
