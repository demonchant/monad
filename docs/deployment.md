# Local deployment

## Requirements

- Node.js 20.19+ or 22.12+ and npm (Vite 8 requirement).
- Browser wallet with Monad mainnet available (chain ID `143`) for signed writes.
- A public RPC connection and access to Kuru's public market API.

## Install and run

```powershell
npm ci
npm run dev
```

The Vite dev server prints a local URL. This client-only app does not need a private server, database, or secret environment variable.

Run the browser flow checks with `npm run test:e2e`. Install Playwright Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium-compatible browser. Tests do not use a demo wallet or submit transactions.

The pinned Playwright container is available for the project playbook's isolated browser run:

```powershell
docker build -f Dockerfile.e2e -t order-steward-e2e .
docker run --rm order-steward-e2e
```

## Wallet and network

1. Connect an injected wallet.
2. Confirm the connected account in the app.
3. If the wallet is not on chain 143, choose the explicit switch-network action; reject leaves the app read-only.
4. The Kuru market API and RPC must be reachable. API data is labelled with its update time/source.
5. The initial market preference targets Kuru's documented Monad mainnet MON-USDC market. Recheck its address against [Kuru's current contract list](https://docs.kuru.io/contracts/Contract-addresses) before a release; never assume the API's first result is the active canonical market.

## Money path

- Orders spend the account's Kuru margin balance, not the token balance shown in the wallet. A fresh one-sided or empty book can still support a post-only limit order; the contract's post-only check remains authoritative when the transaction executes.
- Funding a margin balance requires a token approval (ERC-20 only) and a separate deposit transaction. Each has a separate user confirmation and independently read-back state.
- Placing a limit order and cancelling it are separate user-signed transactions.
- No transfer, approval, deposit, order or cancel is performed by the developer during setup.

## Configuration

`VITE_MONAD_RPC_URL` is optional and must point to Monad mainnet; when absent, the configured public RPC is used. Before enabling chain-dependent actions, the app checks that the RPC chain ID is `143`. Do not put secrets in Vite `VITE_*` values.

## Known operational limits

- Market discovery depends on Kuru's public API.
- Local storage tracks only orders created/added in this browser profile; it is not a full-wallet order history.
- Kuru is treated as mainnet-only for this product; no fake testnet markets or simulated success fixtures.
- Public market metadata may exist while the order book is empty. Empty book means no displayed executable quote.
- Build success does not prove a mainnet trade. See [evidence status](../evidence/README.md).
