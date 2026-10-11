# Rules and judging matrix

**Research status:** official portal is linked below. Exact rules and official judging weights were not visible to the research browser during the build. Do not present internal project-gate scores as Monad judge scores.

| Requirement / criterion | Source | Product behavior / artifact | Proof path | Risk/status |
|---|---|---|---|---|
| Select one of four major tracks | [Official tracks portal](https://hackathon.monad.xyz/tracks) | Onchain Finance & Trading; live Kuru order execution is central | `docs/hackathon-analysis.md`; actual app flow | `CONFIRMED` track names; detailed card wording needs portal review |
| Use sponsor technology meaningfully | [Kuru SDK](https://github.com/Kuru-Labs/kuru-sdk); [Metropolis bounty announcement](https://free-wifi-password-recovery.twstalker.com/monad_dev) | Limit and cancel methods call Kuru's order-book contracts | Source code, tx target/receipt, independent order read | `IMPLEMENTED / UNVERIFIED` on write path |
| Six-week build window / originality disclosure | [Metropolis schedule](https://luma.com/metropolis-lon-oct-2026); current portal rules | App created in workspace during this work; existing two markdown files are guidance only | Build log and repository history once initialized | Exact required disclosure `UNKNOWN`; do not claim rule fully checked |
| Deadline and submission | [Metropolis event schedule](https://luma.com/metropolis-lon-oct-2026); [official portal](https://hackathon.monad.xyz) | Submission materials need live demo, repo and required portal fields | `docs/demo-and-pitch.md`; submission receipt to be added | Deadline publicly stated Oct 13, 2026 11:59 PM ET; recheck portal timezone and acceptance status |
| Official judging weights | Official source not retrieved | No invented percentage claims | Update this table if official rubric becomes visible | `UNKNOWN`; internal 39/50 is not event scoring |
| Working end-to-end product | Event purpose: ship a product on Monad | Connect → read Kuru → fund margin if needed → place → read back → cancel → verify | `docs/demo-and-pitch.md`, app, receipts | Requires user wallet for real write proof |
| Reviewer verification | Current portal requirements not fully readable | Direct links to Kuru API, Monad explorer and transaction hash; explicit status/freshness | README judge path and `evidence/README.md` | Public demo/hosting and submission access not yet configured |

## Official portal checklist before final submission

- Read current participant rules and exact eligibility/geographic restrictions.
- Record the precise deadline and timezone displayed to the team.
- Confirm required demo/pitch/video length, repo visibility/access, profile fields and work disclosure.
- Read Kuru's exact bounty criteria, any separate submission field and any incompatibility/stacking rules.
- Replace the `UNKNOWN` cells above only with cited official text.
