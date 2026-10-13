# ReplicaProof

**Reproduce. Commit exact evidence. Verify through GenLayer consensus.**

ReplicaProof is a research and technical reproduction verification platform. A creator locks the original claim, methodology, criterion list, submission deadline and recheck window. Participants publish reproduction documents at exact Git commits and submit their SHA-256 commitments. GenLayer is central: leader and validators independently retrieve the same files, verify their bytes, interpret the locked requirements, and agree on criterion outcomes before deterministic state is changed.

## Public reviewer portal

https://replicaproof.ansaf1st34.chatgpt.site

Studionet contract: [0x0A639a6bd441853272834D0163f0C449968aA5a3](https://explorer-studio.genlayer.com/address/0x0A639a6bd441853272834D0163f0C449968aA5a3)

[Deployment transaction](https://explorer-studio.genlayer.com/tx/0xbcfb8daaff63ebd86c40d7d690045dadea161ddfb777e6d3804df27e19a4c8c3)

The portal queries `LATEST_FINAL` state, exposes the original standard, submitted documents, hashes, criterion outcomes, append-only revision chains and genuine transaction links. It supports address-only EIP-1193 connection and explicit reviewed writes. Connecting never submits a transaction; no token approvals, Snaps or login signatures are requested. All writes attach zero value. Network fees may apply.

## Contract design

- `create_standard`: locks 1–6 explicit criteria and exact source commitments; no standard edit method.
- `submit`: records participant, timestamp and immutable evidence; globally deduplicates evidence hashes within the standard.
- `evaluate`: permissionless one-time initial evaluation, no later than seven days after the submission deadline.
- `recheck`: participant or creator can add new supplemental evidence, at most twice, within the originally locked window measured from the first decision. Rechecks inspect cumulative evidence and never delete or replace prior evidence or decisions.
- `get_standard`, `get_submission`, `list_standards`, `counts`: public reads.

Each independent assessment checks HTTP status, raw-body SHA-256 and UTF-8 validity before invoking an LLM. It returns only criterion decisions, source-integrity status and verified commitments. The custom validator independently repeats the retrieval and semantic assessment and compares every decision and integrity field; JSON format validation alone is never enough.

Deterministic aggregation: any `FAIL` → **FAILED**; otherwise any `UNKNOWN` → **INCONCLUSIVE**; all `PASS` → **QUALIFIED**. Missing or corrupted evidence cannot qualify. Consensus disagreement may leave a transaction undetermined and does not create an application decision. INCONCLUSIVE is an agreed judgment of insufficient evidence, distinct from protocol-level undetermined consensus.

Decisions contain a revision number, actor, timestamp, reason, cumulative evidence commitment, criterion decisions and previous-revision hash. Locked standard and original submission commitments exclude mutable indexes/history. SHA-256 uses canonical JSON for structured commitments and exact fetched bytes for file commitments.

## Limits and security

Commit-pinned `raw.githubusercontent.com` HTTPS files only; no arbitrary domains, queries, credentials, private network addresses, executable fetching or crawling. Maximum 16 KiB per file and 64 KiB combined. Up to 3 evidence files initially, 6 cumulatively, 128 standards and 32 attempts per standard. Submission deadline: 5 minutes–90 days; recheck window: 5 minutes–7 days. Attached GEN is rejected. Optional rewards are deliberately absent: this release provides verification, not escrow or payout claims.

All source text, including criteria, is untrusted data delimited as JSON under a fixed prompt. The model is instructed to ignore embedded instructions and requested verdicts and not browse or run linked content. The UI escapes untrusted strings. These measures reduce prompt-injection risk; they cannot guarantee correct LLM judgment. Hashes prove document identity, not scientific truth, authorship or that an experiment actually ran. Studionet is a development network. The fixtures and pilot are openly synthetic.

## Reproduce checks

Python 3.12+, Node 22+:

```sh
pip install -r requirements-dev.txt
GENVM_VERSION=v0.2.16 genvm-lint check contracts/replicaproof.py
python -m pytest tests -q
python fixtures/reproduce.py
npm ci
npm run check
npm test
npm run build
node scripts/verify-live.mjs
```

25 direct-mode tests exercise actual SDK storage/context and mocked web/LLM calls, criterion outcomes, independent validator agreement/disagreement, forged results, fail-closed integrity checks, malformed judgment, authorization, duplicate content, deadline enforcement and recheck bounds. Seven frontend tests check escaping, reference validation and finalization/execution gating. Direct-mode tests do not prove live multi-validator consensus; the recorded Studionet pilot provides that distinct evidence.

`fixtures/reproduce.py` actually runs the disclosed concurrency experiment. `qualified.txt`, `failed.txt` and `inconclusive.txt` transparently describe synthetic success, failure and insufficient-evidence cases. `docs/live-state.json` records real finalized reads and transaction verification, not fabricated fixture outputs. `web/src/deployment.json` contains only public deployment and pilot identifiers.

## Official APIs checked

- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle
- https://docs.genlayer.com/developers/intelligent-contracts/features/web-access
- https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context
- https://docs.genlayer.com/api-references/genlayer-test/direct
- https://docs.genlayer.com/api-references/genlayer-linter
- https://docs.genlayer.com/developers/decentralized-applications/reading-data

Pinned runtime: GenVM v0.2.16 and the source dependency header; genlayer-test 0.29.2, genvm-linter 0.11.0, genlayer-js 1.1.8. See the lockfile and CI workflow for reproducible tooling.
