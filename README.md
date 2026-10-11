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

## Proof and limitations

- [Integration and dependency audit](docs/dependency-audit.md)
- [Demo and recovery guide](docs/demo-and-pitch.md)
- [Evidence provenance](evidence/README.md)

The current implementation is scoped to a Kuru market returned by the live Kuru market API. Orders placed by this browser are tracked locally and re-read on-chain. This is not an account-wide order history service. Kuru order placement uses the connected wallet's Kuru margin balance; deposits and trades are real, user-signed mainnet transactions.
