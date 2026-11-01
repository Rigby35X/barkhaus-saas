# Round 1 connector controls handoff

The coordinator assigned these edits on the shared integration checkout, continuing implementation baseline `6c0429d72c904f3f03b7452e911f8f64585e7b44` (HEAD at assignment was its documentation-only descendant `b9df0fa`). No worker branch was switched, committed, merged or deployed by this assignment. Shared SQL/contracts/navigation remain coordinator-owned.

## Implemented

- `services/connectors/http.ts` exports an unmounted `createConnectorHttpHandler({authenticate,store,providers?})`. Bearer identity and membership are resolved server-side; bodies cannot supply authority. Strict bounded JSON and query validation precedes explicit owner/admin actions and staff reads. Responses reconstruct nested DTOs, omit endpoints/credential references/source payloads/cursors, and regenerate safe error messages.
- `SqlConnectorControlStore(database,memberPrincipal,safety)` supplies concrete SQL-backed summary/status/enqueue/disconnect/reconnect controls. Each operation rechecks and locks current membership through COMMIT. Its enqueue writes a durable outbox entry and coalesces active jobs using the same pinned mapping/generation rules as the worker. It does not reuse an unchecked worker capability for a browser action.
- Reconnect is a **review request**: set configured/inactive, advance generation and cancel/fence old work. It never verifies credentials, activates sync or transfers animal ownership. Disconnect preserves records/local data and is idempotent in its desired state.
- Worker checkpoints record database-clock `completedAt` in the existing atomic page transaction. Failures record a timestamp; a later successful sync supersedes older safe error status. A final receipt failure rolls back the success timestamp with the page. No schema migration is added.
- `createConnectorWorkloadVerifier` supplies asymmetric JWT verification using a deployment-owned trusted key selector, exact issuer/audience/subject allowlist and short issued-at/expiry. It returns only internal worker ID; JWT org/connection metadata cannot choose SQL scope. Live JWKS/identity provisioning and scope binding are not configured here.
- `features/connectors` exports `createConnectorClient({endpoint,accessToken,fetch?})`, DTOs and `ConnectorPanel({orgId,role,client,connectionId?})`. The panel loads an explicitly chosen connection, displays saved field/status mappings, last success, sanitized errors and durable job results, and supports queue/disconnect/reconnect-review actions. It never runs a worker or asks for a provider secret. In-flight results are invalidated on organization/connection/client changes. The client requires HTTPS or loopback, sends tokens in headers, forbids redirects and rejects cross-org/malformed successful responses.

Cognito is one deliberately supported, per-connection adapter. It is MBPR's current configured integration example, never a mandatory onboarding step or global connection/form/endpoint default. Native/manual plus CSV acceptance comes first. Google Sheets remains unimplemented/unadvertised as connected.

## Composition and tests

GET `/api/v1/connectors?orgId=...&connectionId=...` returns the summary; adding `jobId` returns sanitized job status. POST JSON contains only `orgId`, `connectionId`, action (`sync`, `disconnect`, `reconnect`) and, for sync only, `requestKey`. The coordinator may compose gated routes and the Integrations tab separately; this assignment does not mount an enabled server handler.

Run `node --test --test-concurrency=1 apps/dashboard/tests/connectors/*.test.mjs`, plus both strict dashboard/platform TypeScript checks. Tests cover HTTP/client redaction and authorization, bounded/forged requests, actual-SQL control membership revocation/cross-org/viewer denial, durable enqueue/replay, completed-page timestamps, disconnect/reconnect fencing, timestamp rollback/recovery and signed workload token rejection. Actual SQL in this assignment uses synthetic local PGlite; it is not hosted Supabase acceptance.

## Outstanding before Round 1 acceptance

- Reviewed hosted workload issuer/JWKS configuration, exact worker-ID-to-org/connection binding, least-privilege SQL login, private credential resolver/rotation, vetted provider transport/egress and durable scheduler/supervisor/queue operations. Do not treat injected proof or credential-reference ports as provisioned services.
- Connection provisioning, mapping **editing** and trusted credential/configuration activation remain reviewed server workflows. This panel displays saved revisions and requests review; it does not silently mutate existing source ownership. An explicit transfer to BarkHaus management remains a separate atomic operation.
- Independent real PostgreSQL connections, managed Auth/Storage and configured provider pagination/revision/snapshot semantics still require authorized staging evidence. No live Cognito request or MBPR credential is needed for local synthetic tests.
- Keep mounted routes authenticated-and-gated, runtime/provider activation disabled, all remote migrations unapplied and PRs #7/#11 unmerged until coordinator acceptance. Production MBPR/proxy/Shopify paths remain untouched.
