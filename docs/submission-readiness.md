# Metropolis Hackathon submission checklist

This checklist records what is present in this public repository. It is not a substitute for entering all required links and disclosures in the official submission form.

## Deadline

The rules supplied for this build state a submission deadline of **October 13, 2026, at 11:59 PM Eastern Time**. November 3, 2026 is the winner announcement date, not the submission deadline. Confirm the form is submitted before the deadline.

## Repository and required documentation

- Public repository: <https://github.com/demonchant/monad>
- Source, build configuration, lockfile, setup, and deployment instructions are in this repository. Start with [README](../README.md) and [deployment instructions](deployment.md).
- The repository is licensed under MIT; see [LICENSE](../LICENSE).
- Direct dependencies, external interfaces, and attribution notes: [ATTRIBUTION](../ATTRIBUTION.md) and [dependency audit](dependency-audit.md).
- Problem, intended users, architecture, and technology stack: [README project overview](../README.md#project-overview).
- The Git history currently contains 11 commits, all dated October 11, 2026, within the stated September 1–November 3 build window. The owner confirms there was no pre-existing foundation.

## Demo evidence

- [Technical demo](../evidence/videos/OrderSteward_Technical_Demo.mp4), about 80 seconds, showing the connected-wallet product flow.
- [Product pitch](../evidence/videos/OrderSteward_Pitch.mp4), about 52 seconds.
- Both repository videos are below the three-minute maximum. The technical demo is the full-function video supplied by the project owner. The README links directly to the public files in this repository. If the official submission form requires a video-host URL, publish the same unedited final video on a public host and enter that URL.
- [Evidence index](../evidence/README.md) describes the videos and verification record.

## Monad deployment and transaction proof

- The app is deployed at <https://demonchant.github.io/monad/> and targets Monad mainnet, chain ID `143`; see [deployment guide](deployment.md).
- The owner confirms end-to-end wallet-signed testing, including margin funding, order placement, contract read-back, reload reconciliation, and cancellation; see [verification record](verification.md).
- The submitted technical demo visibly includes this successful Monad explorer transaction: `0x19b474abc0c3404e4805fc74996ef796c472d33b1a4343230ded399d98ba35eb`, block `112462158`, shown October 11, 2026 at 11:55:52 UTC. The explorer labels its action “MetaMask: Gas Station Call Redeem Delegations.” Do not represent this hash alone as proof of a particular order or cancellation without checking its logs and decoded call.
- The demo also shows Kuru market `0xcb4659fbe7f7718d4e2ce9b91bbf0f04de19249d`; the Kuru router address in the dependency audit is `0xd651346d7c789536ebf06dc72ae3c8502cd695cc`. These are integration addresses, not substitutes for the distinct hashes of the demonstrated order and cancellation transactions.
- The project owner reports that the separate order-placement and cancellation transaction evidence has been lost. Those hashes are therefore unavailable for this submission record; the delegation transaction above is not presented as a substitute.

## Owner disclosures

- **AI tools:** the owner confirms OpenAI Codex was the only AI tool used, including for product implementation and compliance documentation. This disclosure is in the README.
- **Pre-existing foundation:** the owner confirms none was used; this is recorded in [ATTRIBUTION](../ATTRIBUTION.md).
- **External contributions:** the owner confirms there were no external code or asset contributions. Third-party packages and protocol interfaces are identified in [ATTRIBUTION](../ATTRIBUTION.md).
- **Order/cancellation hashes:** the owner reports the transaction evidence has been lost. The available demo hash is labeled as a gas-station delegation action and is not claimed as order/cancellation proof. If the official form requires those specific hashes, this evidence gap remains and must be disclosed accurately.

## Before submitting

1. Open the deployed app and public demo links from a signed-out browser.
2. Enter the repository, deployed app, and public video link(s) in the official form.
3. Include the available on-chain evidence and disclose the missing order/cancellation hashes if the form requests them.
4. Submit by October 13, 2026, 11:59 PM Eastern Time.
