# D: inbound connectors and synthetic Cognito handoff

Contract baseline: `813d605d5465e3b78264a8abd4a9ed790f74f14f`.
Assignment v1/ownership/acceptance acknowledged. Only D-owned files changed.
No SQL, manifests, lockfiles, shared contracts, navigation, MBPR Form 38/proxy,
public reader, Shopify paths or live integration changed. No provider/org defaults,
live credentials, live data mutation, deployment or merge.

## Exported interfaces

- `config.ts`: `CognitoConnection`, `ConnectorError`, `safeMessage`,
  `validateConnection` (explicit connection, immutable saved map, capability and
  transform validation; duplicate targets denied).
- `cognito.ts`: `CognitoTransport`, `CognitoRecord`, `CognitoAdapter`,
  `normalizeCognito`, `sourceOrder`. Stable entry ID stays distinct from adapter
  `compatibilityPublicKey`. Unknown statuses need reviewed maps. Photos bind ID to
  URL and never approve themselves. Birthday input requires `{date, estimated}`;
  no invented estimates or default dog species.
- `ports.ts`: `Scope`, `Lease`, `Snapshot`, `SuccessPage`, `Inbox`, `ClaimedJob`,
  `ConnectorTransaction`, `DurableConnectorStore`, `TrustedConnectorAuth`.
- `worker.ts`: `ConnectorWorker`, `WorkerOptions`, `recordDigest`. Async delivery,
  pre-fetch CAS, immutable retry inbox, scoped source timestamps/digests, B's
  `AnimalWriteService.execute` only, safe failures and bounded retries.
- `control.ts`: `createConnectorControl` for verified enqueue/status/disconnect;
  no unreviewed public route wired. Sanitized output excludes credential refs.
- Dashboard feature `index.ts`: `connectorCapabilities`, `ConnectorJobStatus`.
  Capability explicitly says synthetic fixtures; no provider shown as connected.
  No Google Sheets adapter. Coordinator owns navigation/API composition.

Source upserts send only source-owned core/private custom values. Notes,
applications, publication, approved photos and BarkHaus-owned fields stay local.
A new custom mapping key needs B/A's reviewed ownership registration; the worker
will not assign ownership on existing records. Missing records only become review
candidates after full valid traversal, never deletion. Credentials/failure and valid
empty are distinct. Conflicts stop for review rather than overwriting local edits.

## Verification

Run from this isolated worktree with Node 22.18+ (validated Node 24.19.0):

```sh
node apps/dashboard/tests/connectors/connectors.test.mjs
node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck apps/tenant-site/src/services/connectors/*.ts apps/dashboard/src/features/connectors/index.ts
npm --prefix shared/contracts run typecheck
npm --prefix shared/contracts test
```

The direct Node test command reports individual tests (the environment's outer
`node --test` invocation aggregates this file). Fixture doubles exercise B's
interface and shared ownership policy; they do not replace B's persistent tests.
Tests cover replay, row/outcome rollback, pagination/checkpoints, overlap, stale
source/equal-revision conflict, pre-fetch CAS, local-data and photo preservation,
empty vs failed feeds, retry limits/Retry-After, cancellation/disconnect, expired
fences, two-org isolation, forged worker rejection and delivery timeout.

## Dependencies and blockers

See `deploy/connectors/README.md` for deployable topology and full storage,
authentication, lease, cancellation, retry, monitoring, rotation and rollback
requirements. A owns all schema/durable store enforcement. B must expose its
writer INSIDE the same transaction as connector row outcome and source head;
independent writer commits cannot meet the crash/replay guarantee. Neither
reviewed dependency exists at this baseline; no independent persistence is added.
Cognito modification ordering and consistent snapshot/pagination must be verified;
only synthetic transport envelope is accepted here. Actual secret resolver,
provider transport, scheduler, queue and long-running host remain to provision.

Shell Git network fetch failed because its configured proxy was unreachable.
GitHub connector verified remote contract head and absent remote D branch; local
contract objects matched the exact SHA. Remote publishing uses GitHub Git-data
APIs with a guarded branch update, preserving existing remote work.
