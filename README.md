# Order Steward

**A Kuru spot-order desk for placing, tracking, and cancelling post-only limit orders on Monad.**

Order Steward keeps an order's intent and transaction evidence together, then reconciles the order against Kuru's on-chain state after refresh. It does not custody keys or submit a transaction without the connected wallet's signature.

> **Verification status:** the web app and read paths are implemented and build locally. No wallet transaction has been signed as part of this build, so approval, funding, order placement and cancellation remain `IMPLEMENTED / UNVERIFIED` until independently read back on Monad.

## Judge path

1. Open the app and wait for the Kuru market directory and order book to load. A live-data error stays visible; it is never replaced with sample orders.
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

## Proof and limitations

- [Architecture, scope and status](docs/hackathon-analysis.md)
- [Rules and judge mapping](docs/rubric-matrix.md)
- [Integration and dependency audit](docs/dependency-audit.md)
- [Competitive review](docs/competitive-analysis.md)
- [Demo and recovery guide](docs/demo-and-pitch.md)
- [Evidence provenance](evidence/README.md)

The current implementation is scoped to a Kuru market returned by the live Kuru market API. Orders placed by this browser are tracked locally and re-read on-chain. This is not an account-wide order history service. Kuru order placement uses the connected wallet's Kuru margin balance; deposits and trades are real, user-signed mainnet transactions.
