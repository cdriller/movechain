// Sets MoveChain.ethToCredit (the buy price per credit). Must be called by an admin.
//
// Usage (price given in ETH):
//   PRIVATE_KEY=0x<admin-key> node scripts/set-eth-to-credit.mjs 0.00001
//   PRIVATE_KEY=0x<admin-key> RPC=https://eth-sepolia.g.alchemy.com/v2/KEY node scripts/set-eth-to-credit.mjs 0.00001
//
// After it runs, copy the printed wei value into the frontend constant ETH_TO_CREDIT.
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ethAmount = process.argv[2];
if (!ethAmount) {
  throw new Error(
    "Pass the new price in ETH, e.g.  node scripts/set-eth-to-credit.mjs 0.00001",
  );
}

const pk = process.env.PRIVATE_KEY;
if (!pk) throw new Error("Set PRIVATE_KEY to an admin account's private key");

const rpc = process.env.RPC ?? "https://ethereum-sepolia-rpc.publicnode.com";

const addresses = JSON.parse(
  readFileSync(
    join(root, "ignition/deployments/chain-11155111/deployed_addresses.json"),
    "utf8",
  ),
);
const moveChain = addresses["MoveChainModule#MoveChain"];

const abi = parseAbi([
  "function setEthToCredit(uint256 _ethToCredit)",
  "function getEthToCredit() view returns (uint256)",
]);

const account = privateKeyToAccount(pk);
const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
const pub = createPublicClient({ chain: sepolia, transport: http(rpc) });

const value = parseEther(ethAmount);
console.log(`Setting ethToCredit to ${value} wei (${ethAmount} ETH) on ${moveChain}...`);

const hash = await wallet.writeContract({
  address: moveChain,
  abi,
  functionName: "setEthToCredit",
  args: [value],
});
await pub.waitForTransactionReceipt({ hash });

const now = await pub.readContract({
  address: moveChain,
  abi,
  functionName: "getEthToCredit",
});
console.log(`Done. ethToCredit is now ${now} wei.`);
console.log(`\nUpdate the frontend constant in frontend/src/views/RiderView.tsx:`);
console.log(`  const ETH_TO_CREDIT = ${now}n;`);
