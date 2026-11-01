# B: Round 1 native runtime handoff

Implemented on the coordinator's shared integration checkout from frozen implementation baseline `6c0429d72c904f3f03b7452e911f8f64585e7b44` (current starting HEAD `b9df0fa`, documentation descendant). This bounded assignment made no commits, branch changes, migrations or network/database deployment changes. Original B worker branch is unchanged. The coordinator owns review, combined integration and publication.

## Concrete changes

- `apps/tenant-site/src/services/animals/sql-http.ts`: `createSqlAnimalHttpHandler({database,safety,authorize?})` composes the actual SQL repository, animal service and HTTP handler. Each verified member gets a request-scoped repository; actor/principal organization and Auth UUID must match. No actor comes from command JSON. The database rechecks/locks membership inside the write transaction.
- `sql-authority.ts`: verified Auth/member resolver now supplies the typed member actor alongside its SQL principal. HTTP auth denials keep their status and private/no-store/Vary headers.
- `http.ts`: backward-compatible choice of a static service or request-actor service factory. Member-only command validation and worker/CSV-origin rejection remain enforced.
- `pg-pool.ts`: `createPostgresPersistence({config,allowLocalPlaintext?,onBackgroundError?})` returns a concrete node-postgres-backed `database` and `close()`. Requires explicit host/database/user/password, bounded pool/timeouts, verified TLS for remote hosts and explicit opt-in for disposable loopback plaintext. Rejects connection-string overrides and incomplete settings rather than silently selecting PG environment credentials. Pool creation is lazy; no environment variable enables or mounts it. Login/role delegation and hostname authorization still require operator review.
- `apps/dashboard/src/features/animals/client.ts`: requests use the coordinator's explicit platform API origin, not a legacy organization-table lookup or tenant/provider-derived origin. Session headers, typed IDs, idempotency keys, conflict preservation and no-store remain.

The deployed `animalRuntime` remains its unconditional authorized 503 gate. These factories are only available to explicit local harnesses or a separately reviewed future runtime binding. No production or MBPR route changed.

## Validation

`node --test --test-concurrency=1 apps/dashboard/tests/animals/*.test.mjs`: **29 pass, zero failures/skips**. Added tests cover explicit browser endpoint/auth/typed-ID behavior; pool validation/lazy close; actual local PGlite SQL via HTTP for create/reload/edit, two organizations, viewer/revocation, stale CAS, lost commit acknowledgement and exactly-once replay, conflicting reused keys, trusted-scope mismatch, wrong-org photos, and document signing scope/TTL. The document signer is a synthetic callback, not real Supabase Storage evidence.

Strict server platform and dashboard TypeScript checks pass; whitespace check passes. The coordinator is separately preparing independent PostgreSQL-connection acceptance and combined import/connector tests; their results are not claimed here.

## Remaining Round 1 boundaries

- Runtime/pool/workload binding is prepared, not enabled. Hosted staging application, real Supabase bearer Auth, managed Storage and pool-login role delegation remain outstanding.
- Existing editor supports vetted photo candidates, ordering/approval and signed document reads. It does not provide a completed trusted image upload/finalization or private attachment intake workflow; the old direct animal upload helper remains blocked pending that CAS-aware flow.
- Readable animal history UI is not completed merely by durable receipts/revisions. Define and review a scoped history-read contract before exposing receipts or source data.
- Browser/real hosted reload and independent-connection conflict evidence are separate from synthetic server composition tests. Do not label Round 1 fully accepted from this handoff alone.
