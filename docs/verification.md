# Verification scope

This release uses one final Studionet contract deployed through Cloud Browser / GenLayer Studio in Normal Full Consensus mode. No reward escrow or payouts are used. Source byte identity is checked against the deployment transaction, and all final reads use `LATEST_FINAL`.

The openly synthetic pilot locks an asyncio cache reproduction standard. A separate built-in Studio participant account submits success, failure and insufficient-evidence documents at exact repository commits. The creator then submits new supplemental evidence for a bounded recheck. All earlier documents and revision records remain accessible.

`live-state.json` contains the verified transaction IDs, senders, status, consensus votes and actual contract decisions. Every recorded transaction must have FINALIZED status and a SUCCESS leader execution receipt. The verification script fails if source bytes differ or a recorded transaction is not successful.

Direct-mode unit tests use controlled mocks and are not claimed as real network consensus. The pilot evaluates documents; it does not execute arbitrary participant code or independently confirm scientific truth. The fixture generator separately executes the disclosed technical example.

No wallet transactions were sent from a user wallet. Built-in Studio development accounts were used for the pilot. Production EIP-1193 writes are implemented with a review step and final execution checks; no real MetaMask transaction is claimed as tested.

The incomplete-report fixture was judged FAILED in the genuine pilot (both locked disclosure requirements failed), rather than its anticipated insufficient-evidence outcome. A deliberately incorrect hash is separately used to exercise the fail-closed INCONCLUSIVE integrity path. This behavior is disclosed rather than relabeled.

Release checks: 25 contract tests and 7 frontend tests pass; GenVM AST lint and SDK validation pass with v0.2.16; TypeScript checks, executable synthetic fixture and production build pass. The Explorer contract page was inspected and showed genuine FINALIZED / SUCCESS transactions. No private keys or account secrets are included in the source.
