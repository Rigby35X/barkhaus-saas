# Connector scheduler and worker deployment plan (not deployed)

This branch exports an asynchronous `ConnectorWorker.runOnce` and durable ports.
Only synthetic Cognito transport/store/auth/writer doubles are supplied. There is
no production queue, secret resolver, SQL, new public endpoint or active scheduler.
A browser never executes the worker. Existing MBPR/proxy/Shopify paths are untouched.

## Topology and composition

1. A server control endpoint verifies session and active organization membership
   through A's authorization helper, then calls `createConnectorControl`. Only
   owner/admin may enqueue or disconnect. Staff may read sanitized job status.
   Do not deserialize `WriteActor`, credentials or organization defaults from JSON.
   Expose only explicit connection IDs in the authorized org. Rate limit requests.
2. A service scheduler enumerates explicitly active connections with configured
   schedules. It enqueues using `(org, connection, schedule interval)` dedup keys.
   A durable DB outbox publishes queue notifications after the job commit; periodic
   polling/reconciliation also discovers lost notifications. A managed durable
   queue or DB-backed job table is required, with redelivery and dead-letter alerts.
3. A separately deployed Node 22.18+ process consumes notifications and invokes
   `runOnce` with a verified workload proof. Queue messages contain job identifiers,
   never worker actors, private source payloads, credentials or authority. Bind
   workload identity to audience/expiry and allowed worker service. It keeps working
   with every browser closed. Run under a supervisor/container with graceful stop.
4. Inject A's `DurableConnectorStore`, A's workload/membership verifiers, a reviewed
   Cognito transport and B's transactional `AnimalWriteService`. No memory store in
   production. `ConnectorTransaction.writer` MUST execute in the same DB transaction
   as ledger/outcome writes; wrapping an independently committing HTTP writer is
   invalid. D has no animal persistence implementation.

## Required atomic storage behavior (schema requests to A; no SQL here)

- Scope every connection/mapping/job/inbox/lease/outcome/secret binding by positive
  org ID. Same-org composite references include mapping ID AND immutable revision.
  Job metadata also pins connection/config/credential generation; reject generation
  changes until a reviewed fresh job is created. Revalidate active state each write.
- Unique external identity tuple `(org, connection, externalRecordId)`. Use JSON
  arrays or database tuple columns, never delimiter concatenation or animal names.
  Public `dog-38-N` is a compatibility suggestion, not an internal ID or publication
  command. B's deliberate publication path remains the only publication authority.
- Enqueue atomically coalesces queued/running/retry_wait jobs per connection and
  binds request keys to unchanged payload/config. Only one active lease per
  connection across ALL jobs. Claim uses database time and increments a monotonic
  fencing token. Every write/checkpoint/failure/release compares token, generation,
  cancellation flag and lease expiry inside the transaction. An old worker's
  release cannot clear a newer lease. An expired worker's response cannot write.
- `snapshot` captures scoped animal revisions before provider fetch. `saveInbox`
  atomically persists normalized page + response digest + identity/revision-only
  snapshot before any row write. A retry reads this immutable inbox instead of re-fetching changed input.
  Snapshot metadata excludes private notes/documents. Encrypt normalized private
  payloads at rest; enforce retention/access policies. No raw
  provider response or request secrets enter the ledger or logs.
- `commitPage` runs ONE bounded page transaction containing B's bound writer,
  animal identities/revisions/receipts, source-head digest/revision, every row
  outcome, seen-ID/count updates and `tx.checkpoint()`. There is no standalone
  committing checkpoint or per-row animal commit. Roll back the WHOLE page on
  second-row/outcome/checkpoint failure. Replays are bound to
  identity/job/cursor/revision/payload digest and a durable unit receipt; a lost
  commit acknowledgement must not rewind the committed cursor or rerun writes.
  Lock job/connection fences while writing. A/B's concrete shared SQL adapter is
  required; an independently committing HTTP writer cannot implement this seam.
- Cognito revisions MUST be trusted monotonically increasing UTC modification
  timestamps including milliseconds. Adapter rejects opaque tokens; no lexical
  ordering. Reject changed payload at equal revision, ignore older timestamps,
  and CAS against pre-fetch animal revisions. Confirm Cognito ordering guarantees
  in staging before enabling. If provider offers only opaque revisions, add an
  approved ordering/committed digest-history strategy before integration.
- The transaction-bound `checkpoint` verifies cursor history (reject loops),
  total pages/rows/bytes and
  bounded traversal deadline; recommended reviewed limits: 100 records/page,
  1000 pages, 100000 records, 10 MiB/inbox, 30-minute traversal. Persist seen IDs
  across pages. Only a full valid terminal snapshot may mark unseen records
  `missing_review`; partial/failed/cancelled traversal never does. No deletion.
  Provider snapshot consistency must be verified or completeSnapshot remains false.

## Timing, retries and operations

Supply explicit WorkerOptions, e.g. lease 60s, delivery timeout 45s, 5 consecutive
attempts, base backoff 5s, cap 15m. Never allow timeout >= lease. DB statements and
transactions need deadlines shorter than delivery timeout. The worker races
non-cooperating provider fetches against its abort signal; enforce transport
cancellation too. A queue reaper requeues expired leases until the bounded attempt
limit, then dead letters them. `checkpoint` resets consecutive attempts after a
successful page. Enforce job total lifetime independently of delivery timeout.

Retry unavailable/rate-limit failures with exponential backoff and half-to-full
jitter. Retry-After is a minimum even above backoff cap. Credentials, malformed
feed, ownership/CAS conflicts require review and stop automatic retries. Retain
inbox/outcomes for diagnosis/recovery; a reviewed new source fetch is a NEW job,
never silently replace a failed inbox. Manual cancellation/disconnection bumps
connection generation, revokes fences and aborts delivery. Keep animals, notes,
applications, publication and approvals. `disconnect` may update sync metadata
only; it must not erase records or convert ownership without review.

Credential references resolve only server-side after org+connection binding.
Rotation creates a new generation and cancels in-flight jobs, then an explicitly
reviewed reconnect creates new jobs. Enforce transport host allowlist, TLS,
no redirects, strict content type/byte cap/deadline, and private-network/SSRF
protection. Do not download photo URLs; images remain unapproved candidates.
The fixture envelope (`entries`, `nextCursor`, `completeSnapshot`) is a normalized
transport contract, not a claim about the raw Cognito HTTP API. Implement that
transport only after provider API/pagination/credential review.

Emit org/job/connection identifiers, safe error code, counters, lease age,
queue lag, traversal age and timing only. Never log private animal records,
secret references, credential values or provider bodies/errors. Alert on failed
jobs, dead letters, stale leases, repeated credentials/CAS errors and rising lag.
Control responses omit credentials, mapping contents, raw errors and cursors.

Rollback: disable schedule/queue consumption first, disconnect affected connection
(generation fence), drain/reject old leases, retain outcomes and animal records,
then roll back worker code. Do not roll back data by deleting synced animals or
restoring stale inboxes. Reconnect only after configuration/mapping review.

## Rollout gate

A's reviewed schema and workload/auth helpers, B's transaction-bound writer and
repository reads, queue/supervisor/scheduler, secret resolver/rotation, egress
policy and verified Cognito API semantics are all required. Run two-org real DB
and HTTP acceptance in isolated staging, including crash-between-write-and-outcome,
lease expiry, cancellation and provider pagination, before deployment approval.
Local tests now cover whole-page checkpoint rollback, second-row rollback, lost
commit acknowledgement replay and revision-only snapshots, with doubles only;
they prove no deployed worker,
DB authorization, external API compatibility or production readiness.
