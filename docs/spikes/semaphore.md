# Spike: Semaphore v4 membership proofs (task 1.5)

**Result: go.** `@zpass/sdk` proves and verifies depth-20 Semaphore v4 membership proofs with self-hosted artefacts. Proving makes no third-party requests.

| | |
|---|---|
| Libraries | `@semaphore-protocol/identity`, `/group`, `/proof` 4.14.3 |
| Circuit | Depth 20 for every group (up to ~1M members): one artefact set |
| Artefacts | `semaphore-20.wasm` (1.8 MB) and `semaphore-20.zkey` (3.9 MB) from `snark-artifacts.pse.dev/semaphore/4.13.0`, the version the 4.14.3 prover requests. `scripts/fetch-artifacts.mjs` fetches them once, checks the SHA-256s pinned in `scripts/artifacts.json`, and puts them in `apps/web/public/artifacts`. CI and `apps/web` `prebuild` run it, so a changed file fails the build |
| Proof time (Node 24, Apple M3 Pro) | **607 ms** for a 32-member group (first proof, cold) |
| Verification | `verifyProof` with the bundled verification keys: no network |

What the test (`packages/sdk/src/proof.test.ts`) checks:
- A derived item identity in a 32-member group proves and verifies.
- The proof carries the scope hash and message.
- The same identity and scope give the same nullifier (one action per item per scope). A different scope gives a different, unlinkable nullifier.
- Changing the message invalidates the proof.
- A non-member can't produce a proof.

Decisions:
- **Scope hash** = `keccak256(utf8(scope id)) >> 8`. v4 only takes scope strings up to 31 bytes, and our ids (`poll:<uuid>`) are longer. Recorded in `docs/05-BACKEND-SCHEMA.md` §5.8.
- **Artefact trust:** the checksums were pinned from PSE's artefact server (trust on first use). Before mainnet, cross-check them against the hashes in the PSE trusted-setup ceremony output.

Still to measure in task 3.4: proof time in a browser Web Worker on a mid-range phone (target p50 < 5 s).
