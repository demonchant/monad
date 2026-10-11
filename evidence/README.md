# Evidence and verification status

## Current state

- `CONFIRMED`: Kuru's published SDK documents limit-order placement, order cancellation, margin deposit and margin balance reads.
- `CONFIRMED`: live Kuru public market discovery returned four native MON/USDC markets on 2026-10-11. Kuru's current [official contract list](https://docs.kuru.io/contracts/Contract-addresses) identifies `0x065c9d28e428a0db40191a54d33d5b7c71a9c394` as its official MON-USDC market; the app now prefers this address when choosing its initial market.
- `CONFIRMED`: read-only Monad RPC returned chain ID `143`, nonzero code for the selected market, Kuru market parameters matching MON/USDC token addresses and decimals, and a runtime-resolved margin account address.
- `CONFIRMED`: at the latest read-only probe on 2026-10-11, Kuru's official MON-USDC market returned `syncBlock: 112358456`, 19 bid levels and 35 ask levels. Three other MON/USDC addresses returned `syncBlock: 0` and no levels. This is a point-in-time book snapshot, not a promise of continuing liquidity.
- `UNKNOWN`: whether the official MON-USDC market still has meaningful live depth at demo time; refresh and inspect the book immediately before recording or trading.
- `IMPLEMENTED / UNVERIFIED`: wallet connect, deposit/order/cancel paths until app-specific browser and user-signed chain read-back evidence is captured. Browser tests did not submit transactions.
- `NOT RUN`: user-signed mainnet deposit, order, cancellation, public deployment or hackathon submission.
- Browser E2E tests use a real browser and do not stub Kuru data. In this restricted build environment Chromium reported `ERR_NETWORK_ACCESS_DENIED` for public Kuru/RPC requests, although PowerShell reached Kuru's market API. The suite checks the visible unavailable state here. Repeat live browser reads and wallet-backed writes in an unrestricted browser before claiming full on-chain E2E verification.
- The Docker CLI is installed, but Docker Desktop's Linux engine was unavailable in this environment; `Dockerfile.e2e` is provided, but the container run remains `NOT RUN`.

## Provenance rules

An artifact must name source/network, time, app revision, exact action and limits. Keep wallet secrets/private notes out of evidence. A fixture, screenshot or local build is never described as a live Kuru write. Only a transaction receipt plus independent state read proves a write path.

## Repeat read-only Kuru market probe

```powershell
$body = @{ pairs = @(
  @{ baseToken = '0x0000000000000000000000000000000000000000'; quoteToken = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' },
  @{ baseToken = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603'; quoteToken = '0x0000000000000000000000000000000000000000' }
)} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri 'https://api.kuru.io/api/v1/markets/filtered' -Method Post -ContentType 'application/json' -Body $body
```

## Mainnet evidence to capture with a consenting funded wallet

1. Account and chain ID shown in app; never capture seed/private key.
2. Kuru API source timestamp, selected market address and actual book response.
3. Before balances: wallet token balance and Kuru margin token balance from RPC.
4. If funding: approval receipt, deposit receipt, then independent margin `getBalance` read-back.
5. Order transaction receipt; decoded `OrderCreated` values, market, order ID, wallet owner and block.
6. Independent `s_orders(orderId)` read with remaining size and owner.
7. Reload/reconcile result.
8. Cancel receipt/event plus independent `s_orders` read showing the resulting state.

Do not perform any of these consequential actions without the user's own deliberate wallet confirmation.
