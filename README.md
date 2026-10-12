# Order Steward

**A focused Kuru spot-order desk on Monad, with a public product landing page and a direct path into the trading workflow.**

Live site: [demonchant.github.io/monad](https://demonchant.github.io/monad/). Use **Open the spot desk** to enter the app.

Order Steward keeps an order's intent and transaction evidence together, then reconciles the order against Kuru's on-chain state after refresh. It does not custody keys or submit a transaction without the connected wallet's signature.

> **Build verification:** the project owner confirms the finished build has been verified end to end on Monad, including margin funding, order placement, contract read-back, reload reconciliation, cancellation, and the resulting contract state. Every transaction is signed by the connected wallet.

See the full [build verification record](docs/verification.md) and [video evidence](evidence/README.md).

## Judge path

1. Open the landing page and choose **Open the spot desk**. Wait for the Kuru market directory and order book to load. A live-data error stays visible; it is never replaced with sample orders.
2. Connect an injected wallet on Monad mainnet (chain ID `143`). The app will request a network switch only after you choose that action.
3. Select a market; inspect both the wallet token balance and Kuru margin balance.
4. If required, deposit the market's base or quote token into Kuru margin. Review and sign approval and deposit separately.
5. Preview a post-only limit order, sign it in the wallet, and verify the resulting `OrderCreated` receipt and order state from Monad.
6. Reload to see the locally tracked intent reconciled against `s_orders`; cancel an open order and check the cancellation receipt plus the on-chain postcondition.

## Run locally

```powershell
npm ci
npm run dev
```

The browser talks directly to Monad RPC and Kuru's public API. No server-side signing key is used. See [deployment and configuration](docs/deployment.md).

## Project overview

**Problem:** A resting spot order has a lifecycle beyond submission. Traders need to review funding, wallet authorization, the mined receipt, contract state, and what happened after a reload.

**Intended users:** Monad traders using Kuru spot markets who want a non-custodial interface for post-only limit orders and cancellation.

**Architecture:** The client-side React app reads market metadata from Kuru's public API and chain state from Monad RPC. `viem` handles RPC and wallet-connected contract calls; the injected wallet signs every write. Browser local storage preserves order intent for reload recovery, while Kuru state is used for reconciliation. GitHub Pages serves the static app; there is no application server or key custody.

**Technology stack:** React, TypeScript, Vite, `viem`, Lucide icons, and GitHub Actions/Pages. Setup and deployment are documented in [docs/deployment.md](docs/deployment.md); integrations and dependency review are in [docs/dependency-audit.md](docs/dependency-audit.md).

## Demo videos

- [Technical demo (about 80 seconds)](https://github.com/demonchant/monad/blob/main/evidence/videos/OrderSteward_Technical_Demo.mp4)
- [Product pitch (about 52 seconds)](https://github.com/demonchant/monad/blob/main/evidence/videos/OrderSteward_Pitch.mp4)

Both are under the three-minute limit. The technical demo shows the wallet-connected Monad flow. The source MP4s and captions are in [`evidence/videos`](evidence/videos/).

## License and attribution

This project is released under the [MIT License](LICENSE). Third-party dependencies and protocol integrations are listed in [ATTRIBUTION.md](ATTRIBUTION.md) and [docs/dependency-audit.md](docs/dependency-audit.md).

## AI coding tools

OpenAI Codex was the only AI tool used. It assisted with product implementation and, on October 12, 2026, reviewed the hackathon requirements and prepared compliance documentation. No other AI coding tools were used.

## Proof and limitations

- **Transaction shown in the submitted demo:** `0x19b474abc0c3404e4805fc74996ef796c472d33b1a4343230ded399d98ba35eb` (block `112462158`). The explorer labels this action “Gas Station Call Redeem Delegations”; this is the hash visible in the video and is not identified here as the separate order-placement or cancellation transaction.
- [Integration and dependency audit](docs/dependency-audit.md)
- [Demo and recovery guide](docs/demo-and-pitch.md)
- [Evidence provenance](evidence/README.md)
- [Metropolis submission checklist](docs/submission-readiness.md)

The current implementation is scoped to a Kuru market returned by the live Kuru market API. Orders placed by this browser are tracked locally and re-read on-chain. This is not an account-wide order history service. Kuru order placement uses the connected wallet's Kuru margin balance; deposits and trades are real, user-signed mainnet transactions.
