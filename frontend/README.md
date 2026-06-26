# MoveChain Frontend

Vite + React + wagmi/viem SPA for MoveChain. It supports rider actions (buy
credits, sign trip authorizations) and admin actions (`addOperator` /
`removeOperator`), running against either a local Hardhat node or Sepolia.

## Setup

```bash
npm install
```

## Run

The app uses Vite's mode-specific env files, so you switch networks by switching
the run command — no editing of a shared `.env`.

```bash
# Local Hardhat node (loads .env.local)
npm run dev

# Sepolia backend (loads .env.sepolia)
npm run sepolia
```

Open http://localhost:5173 and connect MetaMask on the matching network.

### Local Hardhat

The simplest path is to run everything from the repo root, which deploys and
writes `frontend/.env.local` for you:

```bash
# repo root
npm run node        # terminal 1
npm run local       # terminal 2 (deploy + start this frontend)
```

MetaMask: add the local network (RPC `http://127.0.0.1:8545`, chain id
**31337**) and import a Hardhat account from the `npm run node` logs.

### Sepolia

`.env.sepolia` is committed with the deployed contract address and a public RPC.
For a reliable RPC, create `.env.sepolia.local` (gitignored):

```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

Then run `npm run sepolia`. MetaMask must be on Sepolia with some test ETH.

## Environment variables

| Variable | Meaning |
|---|---|
| `VITE_CHAIN` | `local` or `sepolia` |
| `VITE_MOVECHAIN_ADDRESS` | Deployed `MoveChain` address |
| `VITE_TRIPCREDITS_ADDRESS` | Deployed `TripCredits` address (shared on Sepolia) |
| `VITE_RPC_URL` | RPC for local mode (default `http://127.0.0.1:8545`) |
| `VITE_SEPOLIA_RPC_URL` | RPC for Sepolia mode |

## Notes

- Admin functions require an **admin** account. MoveChain has three initial
  admins (set at deploy time); any admin can add more via `addAdmin`.
- The ABI in `src/abi/moveChain.ts` is generated from the compiled contract —
  run `npm run gen:abi` (repo root) after contract changes.
