Animal mutations previously used fixture-only persistence, and connector outcomes committed separately from checkpoints. This integrates the reviewed additive schema with a concrete scoped SQL repository and a shared PostgreSQL transaction, then connects CSV batches and connector pages so animals, identities, receipts, outcomes and authoritative progress commit or roll back together.

The integration branch preserves worker branches and leaves draft PR #7 unmerged. Runtime HTTP remains 503-gated; new provider/queue integrations are disabled; no remote migration or production cutover was performed. MBPR public reader, stable keys and Shopify paths are unchanged.

Validation: 34 SQL integration tests, 41 security tests, 66 feature tests and 13 contract tests pass. Dashboard/server strict typechecks and all three application builds pass. Integration tests execute actual local PGlite/Postgres SQL, covering two organizations, checkpoint/receipt failure rollback, commit-time lease expiry, lost-acknowledgement replay, and on-disk close/reopen persistence.

Staging gates remain open: administrator schema export and migration compatibility review, actual independent-connection contention, real Auth/Storage/HTTP/provider verification, and reviewed server pool/workload/secret/queue deployment bindings. Local fixture success is not production readiness.

See docs/platform-integration.md for ownership handoff and docs/platform-integration-results.md for implementation, commands and limitations. Target the coordinator checklist branch; do not merge worker PRs independently.
