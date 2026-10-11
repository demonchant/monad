# Hackathon analysis — Order Steward

**As of:** 2026-10-11. Status labels follow the repository playbook: `CONFIRMED`, `INFERRED`, `UNKNOWN`, `IMPLEMENTED / UNVERIFIED`, `VERIFIED`, `PLANNED`.

## Event and selection

- **Event:** Monad Metropolis, six-week build window, with four tracks: Onchain Finance & Trading; Consumer Products & Payments; Social, Attention & Culture; Trust, Identity & AI Infrastructure. `CONFIRMED` from the [official track portal](https://hackathon.monad.xyz/tracks); page details were not readable through the research browser on this pass.
- **Selected track:** Onchain Finance & Trading. A focused spot-order lifecycle uses the Kuru order book as the core execution venue.
- **Selected product:** Order Steward: connect wallet → choose a live Kuru market → inspect the order book and Kuru margin → optionally approve/deposit → preview a post-only limit order → sign → independently read its order state → persist the intent locally → reconcile it after reload → cancel and verify.
- **Sponsor target:** Kuru. Its published bounty asks for a focused spot product that routes trades through Kuru's on-chain book. The prize announcement and final bounty wording must be checked in the portal before submission; the public announcement is linked in `docs/dependency-audit.md`.
- **Deadline:** public event materials state October 13, 2026, 11:59 PM ET (October 14, 03:59 UTC). `CONFIRMED` by [Monad's submission announcement](https://hackathon.monad.xyz) and [Metropolis event schedule](https://luma.com/metropolis-lon-oct-2026). Confirm the countdown/timezone in the authenticated submission portal before final upload.
- **Official judging weights:** `UNKNOWN`. No weights are asserted here. The repo's project-selection standard is a build rubric, not Monad's official scorecard.
- **Eligibility:** public materials describe a global online event and six-week build period. Exact restrictions, required disclosures and submission fields remain `UNKNOWN` until the current official rules are accessible in the portal. Record reused code and the exact in-window work before submitting.

## User and problem

**User:** a spot trader placing resting orders on Kuru.

**Pain (inferred):** order placement, funding, pending status and cancellation are separate steps. A wallet/app refresh can obscure what happened unless order intent is reconciled with the chain.

**Outcome:** the user can inspect a real market, make one explicit order, see its actual on-chain status and safely attempt cancellation with a verifiable result.

The app tracks orders created in this browser profile. It does not claim to discover every historical order made by the wallet elsewhere.

## Hardest promise and acceptance path

- **Hardest promise:** after the wallet reports a submitted order, Order Steward can identify the actual Kuru order from the mined receipt, preserve its ID/market/intent locally, and later show the chain's current owner/remaining size rather than a cached success label.
- **User trigger:** submit a post-only limit order and then reload or cancel it.
- **Real behavior:** use Kuru's published order-book ABI with `viem` against Monad mainnet; request explicit wallet signatures; wait for a mined receipt.
- **Persisted state:** order intent, transaction hash, market address, order ID, wallet, initial size/price/side and last on-chain observation in browser local storage.
- **Independent postcondition:** re-read `s_orders(orderId)` at the market contract; verify the owner and live remaining size. Cancellation also requires a cancellation event in the mined receipt and a follow-up order read.
- **Abnormal case:** if the user rejects, the RPC is unavailable, or the transaction reverts, show the exact failure and preserve no success status. If the transaction mined but the UI lost its response, reconcile from receipt hash where possible; otherwise show pending/unknown and offer refresh.
- **Reproduction:** see `docs/demo-and-pitch.md`.
- **Status:** `IMPLEMENTED / UNVERIFIED` until a user-signed mainnet action has been independently read back. No wallet/private key was supplied for this build.

## Four-track comparison

| Track | Fit | Decision |
|---|---|---|
| Onchain Finance & Trading | Strong | Chosen: real limit orders and lifecycle state on Kuru. Kuru integration is load-bearing. |
| Consumer Products & Payments | Medium-low | Existing Metropolis submissions already demonstrate walletless/passkey payment and conditional checkout patterns; the selected user outcome is not primarily payment UX. |
| Social, Attention & Culture | Low | Order management has no natural social graph, attention market or cultural artifact; adding one would be decorative. |
| Trust, Identity & AI Infrastructure | Medium-low | Reconciliation is trust-building, but the product does not solve identity or AI infrastructure. Visible agent-vault/AI-intel submissions are closer to that track. |

Visible competitor examples are collected in `docs/competitive-analysis.md`; public repo activity is not a complete entrant census.

## Idea gate (internal, not the official judging rubric)

| Dimension | /5 | Basis |
|---|---:|---|
| User pain and specificity | 4 | Concrete multi-step order lifecycle; pain is plausible but not user-interview validated. |
| Rubric fit and eligibility confidence | 4 | Strong stated track fit; full current rules still need portal confirmation. |
| Distinctive mechanism | 3 | Recoverable intent-to-receipt-to-chain-state flow is a real differentiator, but trading UI competition is significant. |
| Hardest promise buildable/provable | 4 | SDK and chain read paths exist; live signed transaction remains unverified. |
| Sponsor integration load-bearing | 5 | Product's primary user action calls Kuru order-book contracts. |
| Data/API/credential feasibility | 4 | Live Kuru market API and public chain reads respond; browser CORS and wallet provider vary by environment. |
| Evidence practical | 4 | Receipts, event logs and on-chain order reads are independently inspectable. |
| Failure/recovery handling | 4 | Explicit rejected/pending/failed states and reload reconciliation are in scope. |
| Judge can understand/try quickly | 4 | One market/order workflow, with no account abstraction or AI prerequisite. |
| Solo/time scope | 3 | Feasible as a narrow web app; user-signed mainnet validation and demo credentials are external blockers. |
| **Total** | **39/50** | Passes internal ≥35 gate. Not a win prediction. |

## Architecture and boundaries

```text
Kuru market API + Monad RPC reads
        ↓ (source and freshness shown)
market/book + token/margin balances + tracked order intent
        ↓ (strict market parameter validation; user reviews preview)
injected wallet signs approval / deposit / Kuru limit / cancel calls
        ↓
Monad receipt and decoded Kuru events
        ↓ (independent contract read-back)
local tracked intent reconciled to owner + remaining size + status
```

- **Client:** React + TypeScript + Vite; injected EVM wallet via `viem`; narrowly scoped Kuru contract ABIs; no backend, custody key, AI or off-chain order executor. The Kuru SDK was excluded after its published dependency tree raised critical security advisories.
- **State:** local storage keyed by chain + account. It is a convenience index, not authoritative order state. Chain state wins on conflicts.
- **Order policy:** post-only GTC limit orders only. No market orders, trigger orders, bots, auto-cancel or risk advice.
- **Networks:** Monad mainnet chain ID 143 for Kuru. No Kuru testnet market is assumed. Read-only fixture/demo success is not provided.
- **Money actions:** never auto-sign. Approval, deposit, placement and cancellation each have explicit user review and wallet signature boundaries.
- **Data:** market listings/book from Kuru's public API; market parameters, margin balances, order records and transaction receipts from Monad RPC. API failure is visible.

## Failure model

| Failure | UI response / recovery |
|---|---|
| Kuru API unavailable or invalid payload | Keep trading disabled, identify source, offer retry; no cached data presented as fresh. |
| Wallet absent / wrong chain / account changed | Explain state; connect or explicit network switch; clear account-scoped data when account changes. |
| Market params/order data unavailable | Disable dependent actions and show RPC read failure. |
| Insufficient Kuru margin | Show actual on-chain margin balance and a user-initiated deposit path. |
| Approval rejected/fails | Show approval status/error; do not attempt deposit. |
| Deposit succeeds but app loses response | Re-read margin balance and show observed state; do not label based only on wallet response. |
| Order/cancel rejected, reverted or pending | Preserve exact state; expose transaction hash if known; reconcile before retry; do not show success based only on wallet submission. |
| Local storage unavailable/corrupt | Show that local tracking cannot persist; disable new placement and cancellation because pending transaction recovery would not survive reload. |
| Tracked order is closed but reason not proven | Show `Closed (reason not confirmed)` rather than claiming filled or cancelled. |

## Plan and current state

1. Confirm Kuru contract interfaces and API response shapes. Read-only responses are verified in this environment; no write is signed.
2. Build the app and project records. `IMPLEMENTED`; production build and lint are passing with non-blocking React lifecycle/dependency warnings.
3. Build/lint and local Chrome E2E pass for unavailable-feed, no-wallet, navigation and 390px/320px responsive states. Direct shell probes verified Kuru API and Monad RPC reads. Browser network isolation and unavailable Docker engine prevent a containerized live-data/wallet run.
4. Capture a real transaction only with an explicitly connected/funded user wallet; do not fake this evidence.
5. Prepare demo and submission materials after current portal rules are checked.

## Claim-to-proof ledger

| Claim | Required observable behavior | Proof | Status |
|---|---|---|---|
| “Live Kuru markets and book” | Current Kuru API result with timestamp; source error stays visible | API response in browser/network and `evidence/README.md` | `IMPLEMENTED / UNVERIFIED` in app |
| “Post-only limit order routed through Kuru” | User signature, mined receipt containing `OrderCreated`, exact Kuru market target | Transaction link + decoded receipt | `IMPLEMENTED / UNVERIFIED` until signed |
| “Order status is chain-backed” | Contract read confirms owner and remaining size on connect/reload | `s_orders` read with market, block and timestamp | `IMPLEMENTED / UNVERIFIED` until live read |
| “Cancel is verified” | Receipt cancellation event plus later on-chain size zero | Transaction link and post-read | `IMPLEMENTED / UNVERIFIED` until signed |
| “Order intent survives reload” | Browser local-storage record restored and reconciled | Browser reload + changed on-chain observation | `IMPLEMENTED / UNVERIFIED` until browser run |

