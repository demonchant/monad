# Dependency and integration audit

**Checked:** 2026-10-11. Public reads were checked from the development environment. The project owner confirms the finished wallet-signed product flow and contract read-back have since been verified end to end on Monad. See [build verification](verification.md).

| Integration | Exact role | Observed / version | Auth and side effect | Failure and proof |
|---|---|---|---|---|
| Kuru public markets API | Discover live market addresses/token metadata; current endpoint from Kuru SDK `PoolFetcher` | `POST https://api.kuru.io/api/v1/markets/filtered`; request with MON/USDC token pair returned live market metadata including market `0xcb4659fbe7f7718d4e2ce9b91bbf0f04de19249d` | Public read; no credentials | A response was observed through `Invoke-RestMethod`; API is not treated as chain truth. Bad response disables trading. |
| Kuru public L2 book API | Display current bid/ask and API block cursor | `GET https://api.kuru.io/api/v2/orders/market/{market}/l2book`; response shape includes `success/timestamp/data.asks/bids/syncBlock` | Public read; no credentials | The selected MON/USDC market returned `syncBlock: 0`, zero bid levels and zero ask levels during the 2026-10-11 probe. No liquidity claim is made; app shows empty depth honestly. |
| Monad mainnet | Market parameter reads, token/margin balance reads, receipt/order verification | Read-only JSON-RPC probe on 2026-10-11 returned chain ID `0x8f`; `getMarketParams()` for MON/USDC returned price precision `100000000`, size precision `1000000000`, native MON/USDC token addresses, decimals `18/6`, tick `10`, and nonzero market bytecode. Router getter returned margin account `0x2a68ba1833cdf93fa9da1eebd7f46242ad8e90c5`. The project owner confirms the complete wallet-signed lifecycle is verified. | Public reads; injected wallet signs all transaction writes | RPC outage/wrong chain is visible; write lifecycle and state read-back are verified. |
| Kuru TypeScript SDK (evaluated, not shipped) | Its documented order-book, cancel, margin and deposit paths were compared with direct contract calls | Published npm release found during research was `@kuru-labs/kuru-sdk@0.0.95`; a local repository snapshot declared unpublished `0.0.97`. Its dependency tree produced critical and high npm advisories, so the runtime package was removed. | Not a runtime dependency | Product calls Kuru contracts directly using narrow ABI entries from Kuru's published artifacts and current `viem`; avoid implying SDK methods are integrated. |
| Kuru OrderBook and MarginAccount contracts | Market parameters, order state, limit placement, cancellation, margin balances and deposits | Narrow ABI entries in `src/lib/kuru.ts`; router getter resolves the margin contract at runtime | Reads through Monad RPC; connected wallet signs writes | The project owner confirms mainnet writes and independent state read-back are verified end to end. |
| Kuru Router / Margin Account | Resolve official shared margin account address and balances | Router listed at `0xd651346d7c789536ebf06dc72ae3c8502cd695cc`; account address should be read from router's `marginAccountAddress()` getter at runtime, never hardcoded from a label | Reads public; deposit involves token approval and separate deposit tx | Verify bytecode/getter on chain before using; compare margin balances before/after deposit. |
| Browser local storage | Client-side order intents and pending transaction recovery | Local, account/chain scoped | No network auth; not authoritative | Clear/corrupt storage must not create a success state. Chain state replaces stale status. |

## Market API probe record

- **Request:** POST `/api/v1/markets/filtered`, JSON `pairs` containing both directions for native MON/USDC and WMON/USDC.
- **Observed result:** JSON response with market metadata, token names/tickers/decimals, market addresses, price/size precision and pagination. Native MON/USDC returned a market address `0xcb4659fbe7f7718d4e2ce9b91bbf0f04de19249d`.
- **Important limit:** API's `lastPrice` and `liquidity` fields were null in the captured response. Market discovery is not proof of current executable liquidity. Book and on-chain calls must still be checked before displaying price estimates or enabling orders.
- **Credential requirement:** none for this public request.
- **Evidence:** no raw response with user data/secrets is committed. Repeat the request using the command in `evidence/README.md` before demo.

## Security boundaries

- Never request/export a private key or seed phrase.
- Only target chain ID 143 and market addresses returned from the Kuru API; verify each address's market params on chain before enabling actions.
- No arbitrary RPC/API URL is accepted from user input.
- Allowance is exact-amount approval, not unlimited. Approval and deposit are separate wallet-confirmed steps.
- No auto-switch or auto-submit: network/account change is explicit and visible.
- Local order metadata is not presented as chain-confirmed status.
