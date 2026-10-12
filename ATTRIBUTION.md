# Third-party code and attribution

Order Steward's application code is maintained in this repository. The project uses the following open-source packages and external interfaces; consult their own license and terms when redistributing those components.

## Runtime packages

- React and React DOM — UI framework, MIT; versions are recorded in `package-lock.json`.
- `viem` — Ethereum-compatible RPC and wallet client, MIT; version is recorded in `package-lock.json`.
- `lucide-react` — Lucide icons for React, ISC; version is recorded in `package-lock.json`.

## Development packages

Vite, TypeScript, ESLint, Oxlint, Playwright, and their transitive packages are used for building, type checking, linting, and browser automation. Their exact versions and package metadata are recorded in `package-lock.json`; each package retains its own license. Review the lockfile and package metadata for a complete dependency inventory.

## Protocol and integration references

- Kuru: public market discovery and order-book APIs, and OrderBook, Router, and Margin Account interfaces on Monad. Contract calls use the narrow ABI definitions in `src/lib/kuru.ts`; the project does not bundle or redistribute Kuru's SDK.
- Monad: mainnet chain interface (chain ID 143) and public RPC configuration.

Names and trademarks remain the property of their respective owners. External service and protocol use does not imply endorsement.

## Original materials

The project owner confirms that Order Steward uses no pre-existing foundation, starter project, copied/adapted external source files, or externally contributed project code or assets. The Git history begins with the product implementation commit on October 11, 2026, within the stated build window. Runtime and development packages and protocol interfaces are listed above; their use is not a claim of external code contribution.
