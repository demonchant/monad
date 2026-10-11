# Product verification and demo media

## Build verification

The project owner confirms that the finished Order Steward build has been exercised and verified end to end on Monad. Verified flow: connect wallet; read Kuru markets and balances; fund Kuru margin; place a post-only order; match the transaction receipt and Kuru event; read the order state from the market contract; reload and reconcile the order ledger; cancel the order; and confirm the cancellation event and resulting contract state.

The app is non-custodial. Every transaction is signed by the connected wallet. Order intents are stored in browser local storage and reconciled against Kuru contract state.

## Video deliverables

- [Product pitch](videos/OrderSteward_Pitch.mp4) — about 52 seconds.
- [Technical demo](videos/OrderSteward_Technical_Demo.mp4) — about 80 seconds.
- [30-second motion promo](videos/OrderSteward_30_Second_Promo.mp4) — 30 seconds, animated graphics, app footage, voiceover, and captions.

The pitch and technical demo use the supplied `1.mp4` screen recording with revised narration that reflects the verified build. Wallet extension details are blurred in the relevant app footage. The promo combines animated product graphics with a cropped app capture.

Narration sources: [pitch](../docs/pitch-video-narration.txt), [technical demo](../docs/technical-demo-narration.txt), and [promo](../docs/promo-video-narration.txt). Rendering scripts and assets are in `evidence/videos/`.

Upload the MP4s to a public video host to get links for the hackathon submission. The repository contains the files; no YouTube upload is made from this workspace.
