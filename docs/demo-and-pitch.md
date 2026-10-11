# Demo and pitch

## 90-second judge path

Preflight: live Monad mainnet, Kuru API reachable, wallet connected to chain 143 with only the small amount the presenter chooses to risk, and enough Kuru margin for the chosen post-only order. Do not make up a wallet, balance, order, receipt or liquidity state.

1. **Problem (10s):** “A resting spot order is a lifecycle, not one click. If the interface loses track, the user must check the market contract.”
2. **Live inputs (15s):** load Kuru's market directory and MON/USDC market; point to the API timestamp/block and live book state.
3. **Funding (optional, 15s):** show wallet and margin balances separately. If unfunded, demonstrate review → approve → receipt → deposit → independent balance read-back. Skip if it risks demo funds or time.
4. **Order (20s):** choose side, price and size; show post-only rule, precision/minimum checks, approximate notional and source timestamp. Review and sign in wallet.
5. **Verify (15s):** show receipt transaction and decoded order ID, then the `s_orders` contract read with owner/remaining size.
6. **Recover/cancel (15s):** reload; app restores local intent and reconciles it. Cancel an open order, verify cancellation event and size-zero post-read. If no safe funded demo order is available, show the real read-only path and clearly report live-write verification as blocked, not successful.

## Error/recovery rehearsal

- Reject wallet signature: UI returns to idle with `Rejected in wallet`; no pending/success order appears.
- Wrong network: order/deposit/cancel controls are disabled with explicit switch action.
- Kuru API unavailable: market source error is visible, refresh available, no stale quote treated as live.
- RPC unavailable: source freshness/read error is visible, no signing action.
- Cancel for already-closed order: reconcile `s_orders`; show `Closed (reason not confirmed)` unless receipt/event proves cancellation/fill.
- Browser refresh after a mined order: reload and check actual order state, not just the local `pending` label.

## Pitch

“Order Steward is a Kuru spot-order desk for Monad. It makes the order lifecycle reviewable: the trader sees the market and margin balance, chooses one post-only limit order, signs it, and gets an order ID that is checked against the Kuru contract. After a reload, the app reconciles the saved intent against current chain state. It is non-custodial, has no autonomous order execution, and does not call a closed order ‘filled’ unless the evidence says so.”

Use present tense for only the behaviors observed in the submitted build. Do not claim the 600ms confirmation speed, a safety guarantee, a stop order, full account history, user demand, or sponsor endorsement without direct evidence.
