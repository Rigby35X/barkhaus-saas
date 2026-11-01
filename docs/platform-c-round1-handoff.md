# CSV Round 1 runtime handoff

Implementation baseline: `6c0429d72c904f3f03b7452e911f8f64585e7b44`; shared integration checkout includes the subsequent documentation-only baseline pin. The coordinator authorized bounded ownership of CSV feature/service/test files for this follow-up. No worker branch, remote database or production integration was changed.

## Implemented

- `apps/dashboard/src/features/imports/http-client.ts` exports `createCsvOnboardingHttpClient({endpoint, accessToken, fetch?})`, implementing the existing persistent onboarding interface. It obtains a fresh bearer token for each request, refuses redirects, disables caching, bounds JSON responses and returns fixed safe error messages. Endpoints may be same-origin paths, reviewed HTTPS, or explicit HTTP loopback for local development; credentials, query/fragments, other HTTP and origin-confusing backslashes/control characters are rejected.
- `apps/tenant-site/src/services/imports/http.ts` exports `createCsvHttpHandler({database, safety, authorize, date?})`. Authorization is server-supplied and returns a verified member or denial response. Per-request `SqlImportStore` rechecks/locks persisted membership and pinned job authority. Browser-supplied actor/role/state fields, unknown/duplicate query parameters and unsupported operations are rejected. Request streams and CSV size are bounded. Database errors are sanitized and private source locations are redacted from job responses.
- `apps/tenant-site/src/services/imports/runner.ts` exports `createCsvBatchRunner({database, safety, resolveDelegation})`, returning an explicit supervised single-batch function accepting only `{orgId, jobId}`. Delegation must be resolved by trusted server/workload code against the persisted job initiator. Queue JSON cannot supply an actor or role. Each batch uses the existing shared transactional writer and immutable job definition.
- CSV onboarding now provides a downloadable provider-independent example template and job-ID recovery outside the preview form, so a user can recover an existing job after reload without starting another job.
- Invalid CSV/matching inputs receive HTTP 400; changed reuse of an immutable job ID receives HTTP 409. Error messages from SQL, raw source contents, private storage locations and credentials are not returned. Direct service validation messages remain available for internal fixture tests; the HTTP layer exposes fixed messages.

No CSV route is mounted by this module. The coordinator may expose a separate authorization-first 503 route; that does not activate this implementation factory. No browser HTTP operation executes a batch. Start/retry create durable queue/outbox requests only.

## Wire contract

All calls use `Authorization: Bearer <verified session token>` and private/no-store responses.

| Method | Request | Success body |
| --- | --- | --- |
| GET | `?op=mappings&orgId=...` | Latest native saved mappings |
| GET | `?op=job&orgId=...&jobId=...` | Job progress/outcomes, redacted source location |
| POST | `{op:"save_mapping", mapping}` | `{ok:true}` |
| POST | `{op:"preview", input, source}` | Preview/issues; no writes |
| POST | `{op:"start", input, source}` | HTTP 202 job; enqueue only |
| POST | `{op:"retry", orgId, jobId}` | HTTP 202 current job; enqueue unfinished work only |

`input` is the existing versioned import request: `id`, `orgId`, `mappingId`, `mappingRevision`, `matching`, `acknowledgeCreateOnly`. Source text is a bounded UTF-8 CSV string, never a remote URL. Import IDs and stable mapping identities retain their existing contracts. Rejected rows require a corrected file and new reviewed job; the original job's input remains pinned.

## Evidence

`node --test --test-concurrency=1 apps/dashboard/tests/imports/*.test.mjs`: **28 tests pass**. Four new HTTP/client tests include actual PGlite SQL for mapping → preview → enqueue → supervised batch → recovered status/replay; zero animal writes before queue execution; immutable request conflict; anonymous/viewer/cross-org/forged requests; streamed request limits; stale membership failure; private location/error redaction; and client/runner input boundaries. Existing parser, batch rollback/lost-acknowledgement replay, bounds, source ownership and publication tests remain passing. UI server-render checks cover template/recovery and permissions. Dashboard/platform strict typechecks pass as part of integration review; the coordinator records final combined evidence after all modules settle.

## Remaining gates

The coordinator must compose the UI and reviewed runtime/database factory, with a durable supervised outbox consumer and trusted job delegation. Real Auth, hosted Storage, independent PostgreSQL connections, browser interactions and end-to-end staging acceptance remain separate evidence; PGlite tests do not establish those results. This handoff neither enables deployed writes nor provisions scheduler/workload/database credentials. It does not authorize remote migrations, deployment, production change or PR merge. Native/CSV onboarding has no Cognito dependency.
