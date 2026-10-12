# Order Steward build verification

**Status: VERIFIED END TO END**

The project owner confirms that the finished Order Steward build has been exercised and verified on Monad. This is the completed build verification record for the product.

The verified path covers:

1. Connect a wallet on Monad.
2. Load Kuru markets, order book data, wallet balances, and Kuru margin balances.
3. Approve and deposit margin, then confirm the updated balance.
4. Review and sign a post-only limit order.
5. Match the mined transaction receipt with the Kuru order event and read the resulting order state from the market contract.
6. Reload and reconcile the tracked order against current contract state.
7. Sign an order cancellation, confirm the cancellation event, and read the resulting contract state.

Order Steward is non-custodial: the connected wallet signs every transaction. Tracked order intent is stored in the browser and reconciled against Kuru contract state.

The project videos and submission copy describe these completed flows as verified. See [the technical demo](../evidence/videos/OrderSteward_Technical_Demo.mp4) and [evidence index](../evidence/README.md).

## Transaction visible in the submitted demo

The explorer view in the submitted technical demo shows successful transaction `0x19b474abc0c3404e4805fc74996ef796c472d33b1a4343230ded399d98ba35eb` in block `112462158`, at 2026-10-11 11:55:52 UTC. The explorer labels the action “MetaMask: Gas Station Call Redeem Delegations.” This is recorded as visible demo evidence; this record does not claim that this hash is the separate Kuru order-placement or cancellation transaction. Obtain and list those hashes from the wallet/explorer if the submission form requests them.

The demo displays Kuru market `0xcb4659fbe7f7718d4e2ce9b91bbf0f04de19249d`. The Kuru router address documented in the integration audit is `0xd651346d7c789536ebf06dc72ae3c8502cd695cc`; the margin account is resolved from the router getter at runtime.
