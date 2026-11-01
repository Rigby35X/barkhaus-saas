# Round 1 disposable PostgreSQL acceptance

The new `apps/dashboard/tests/postgres/round1.test.mjs` suite passed **9 tests, zero failures/skips** against an actual local PostgreSQL 17 container, using concrete `pg` pools, the reviewed transaction transport and the new HTTP composition factories. The exported hosted staging server version is 17.11; this local image does not reproduce every Supabase extension, owner, role or managed Storage behavior.

## Evidence

- A native create through a real loopback Node HTTP server survives GET/reload through a separate pool.
- Two overlapping transactions return distinct `pg_backend_pid()` values. Parallel edits of revision N through two HTTP/pool paths yield exactly one success and one HTTP 409, with one revision advance.
- Anonymous/unrecognized synthetic identity, cross-organization, revoked membership and viewer writes fail. The native test deliberately gives the viewer a stale/forged owner claim; persisted SQL membership still denies it. The second organization can independently create its own record.
- Injecting an error **after an actual committed transaction** makes the native HTTP call return 503. The same command/key through another pool returns its durable receipt as a replay, with one receipt.
- The persistent browser CSV transport talks through the loopback HTTP server. Preview/start do not write animals; start enqueues. An explicit supervised batch runner commits records, and status reload recovers progress/results with private source locations redacted.
- A CSV final-checkpoint error rolls back every animal, import identity, write receipt, row outcome, unit receipt and authoritative checkpoint in that batch. A later runner resumes and commits once.
- CSV acknowledgement loss after actual COMMIT resolves durable completion and replay does not duplicate records or the unit receipt.
- An explicitly configured synthetic Cognito connection uses numeric IDs and form `999`, with an in-process adapter response and no provider requests. Final page checkpoint failure leaves no animals/source heads/outcomes/unit receipts. Retry commits once. A subsequent committed update with lost acknowledgement stays completed, retains two scoped records and one page receipt.
- The new connector control HTTP/SQL path returns a completion timestamp and saved mapping while excluding endpoint/credential references, and rejects the other organization.

## Reproduction — local disposable resources only

Use the managed local Docker socket. Never substitute a hosted connection URL or database name. The suite ignores inherited `PG*` connection selectors by supplying an explicit host, port, database, user, password and TLS setting. It will only connect to `127.0.0.1:55432`, database `barkhaus_round1_local`. It refuses an existing `platform_animals` table instead of resetting an application database.

Create a fresh disposable container, exposing PostgreSQL on loopback only:

```sh
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock run --detach --rm \
  --name barkhaus-round1-postgres --publish 127.0.0.1:55432:5432 \
  --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_DB=barkhaus_round1_local postgres:17
```

The `trust` setting is for this disposable loopback-only synthetic database, never hosted/runtime configuration. Wait for its local `pg_isready` check, then run:

```sh
BARKHAUS_LOCAL_POSTGRES_TEST=1 node --test --test-concurrency=1 apps/dashboard/tests/postgres/round1.test.mjs
```

Without the explicit opt-in the test is skipped; that is not passing database evidence. Afterward stop this specific disposable container:

```sh
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock stop barkhaus-round1-postgres
```

The `--rm` deletion may complete asynchronously; confirm the named container is gone before creating a fresh one for another run. No volume is mounted. Do not reset or reuse a database with application data.

## Limits and gates

Authentication and workload verification are **synthetic resolvers**, not Supabase Auth/JWT or real worker proof. The SQL database rechecks actual seeded membership rows. The test pools use a local PostgreSQL administrator login so they can select the NOLOGIN application roles; this does not establish least-privilege deployed login/delegation behavior. The harness injects errors after COMMIT; it does not sever a live network connection during a commit packet exchange.

No hosted project, remote migration, Auth account, Storage object, live connector, application deployment, operational factory mounting or runtime activation occurred. The coordinator added only unavailable-state gated routes. The real Supabase Auth/Storage/recovery/invitation acceptance and production/MBPR compatibility remain separate. Passing this suite materially improves local concurrency/persistence evidence; it does not complete Round 1 hosted/UI acceptance or authorize a merge/deployment.
