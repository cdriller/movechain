# MoveChain

Smart contracts (Hardhat 3 + Foundry tests) and a Vite/React frontend for a
ride-credit platform. Riders buy credits, operators run trips authorized by
EIP-712 signatures, and admins manage operators and conversion rates.

## Contracts

- **`contracts/MoveChain.sol`** — the main contract.
  - **Multi-admin access control:** three initial admins are set in the
    constructor; any admin can add further admins via `addAdmin` (there is no
    `removeAdmin` — admins are permanent).
  - Operator management (`addOperator` / `removeOperator`), credit pricing,
    and EIP-712 signed trip start/complete.
- **`contracts/TripCredits.sol`** — an ERC-1155 credit token. It is deployed
  **separately** and `MoveChain` is registered as its platform via
  `setPlatform`. Keeping it out of the `MoveChain` constructor makes repeated
  `MoveChain` deployments cheaper.

## Project layout

```
contracts/            Solidity sources + Foundry tests (*.t.sol)
ignition/modules/     Hardhat Ignition deployment module
ignition/params/      Per-network constructor parameters (admin addresses)
scripts/              Helper scripts (ABI generation, local deploy)
frontend/             Vite + React + wagmi/viem app
```

## Prerequisites

```bash
npm install
cd frontend && npm install && cd ..
```

## npm scripts

### Root (whole project: contracts + deploy + frontend)

| Command | What it does |
|---|---|
| `npm run compile` | `hardhat compile` and regenerate the frontend ABI |
| `npm run gen:abi` | Regenerate `frontend/src/abi/moveChain.ts` from the compiled artifact |
| `npm run node` | Start a local Hardhat node on `127.0.0.1:8545` |
| `npm run deploy:local` | Deploy to the local node and write `frontend/.env.local` |
| `npm run local` | `deploy:local` **and** start the frontend (local mode) |

### Frontend only (`cd frontend`)

| Command | What it does |
|---|---|
| `npm run dev` | Dev server in local mode (loads `.env.local`) |
| `npm run sepolia` | Dev server against the Sepolia backend (loads `.env.sepolia`) |
| `npm run build` / `npm run build:sepolia` | Production build (local / Sepolia mode) |

## Environment files (frontend)

The frontend uses Vite's mode-specific env files, so local and Sepolia configs
never clash:

| File | Purpose | Git |
|---|---|---|
| `frontend/.env.sepolia` | Sepolia config (public values only) | committed |
| `frontend/.env.local` | Local Hardhat config, auto-written by `npm run local` | ignored |
| `frontend/.env.sepolia.local` | Optional private Sepolia RPC (Alchemy/Infura key) | ignored |

`*.local` files take precedence, so put secrets there.

## Local development

```bash
# Terminal 1 — keep the node running
npm run node

# Terminal 2 — deploy + start the frontend
npm run local

# Terminal 3 (optional) — frontend only, if it isn't already running
cd frontend && npm run dev
```

In MetaMask: add the local network (RPC `http://127.0.0.1:8545`, chain id
**31337**) and import a Hardhat account printed by `npm run node`. Accounts
#0–#2 are the default admins (see `ignition/params/localhost.json`).

## Deploying to Sepolia

1. Set the deployer config variables (private key + RPC + Etherscan key):

   ```bash
   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
   npx hardhat keystore set SEPOLIA_RPC_URL
   npx hardhat keystore set ETHERSCAN_API_KEY
   ```

2. Put your three admin addresses into `ignition/params/sepolia.json`
   (three **different** addresses — duplicates revert).

3. Deploy (this deploys `TripCredits` + `MoveChain` and wires `setPlatform`):

   ```bash
   npx hardhat ignition deploy ignition/modules/MoveChain.ts \
     --network sepolia \
     --parameters ignition/params/sepolia.json
   ```

   The deployed addresses land in
   `ignition/deployments/chain-11155111/deployed_addresses.json`.

4. Point the frontend at the new `MoveChain` address in
   `frontend/.env.sepolia`, then run `cd frontend && npm run sepolia`.

> If you change the contract and redeploy to an existing deployment, Ignition
> may report a reconciliation error. Either wipe the affected future
> (`npx hardhat ignition wipe <deployment-id> "MoveChainModule#MoveChain"`) or
> deploy under a fresh `--deployment-id`. Each redeploy creates a new address.

## Tests

Foundry-style Solidity tests live in `contracts/*.t.sol`:

```bash
forge test          # with Foundry installed
# or
npx hardhat test
```
just a stupid change
