# Draft: Platform A identity and additive v1 schema foundation

Target: `feature/platform-contracts-v1-20261026`
Head: `feature/platform-a-identity-schema-v1`
Contract base: `813d605d5465e3b78264a8abd4a9ed790f74f14f`

The platform needs tenant-scoped persistence and trusted account flows before
native animals, CSV imports and connector writes can share a secure writer. This
adds read-only preflight tooling, synthetic fixtures, additive v1 schema and
policies, recovery UI, single-use invitations and administrator-only initial owner
provisioning for independently verified existing organizations.

Staged commits cover A1 preflight/fixtures, A2 schema/storage/worker guards, and A3
identity flows. Existing legacy tables and MBPR public integrations are preserved.
Nothing was applied remotely. Live Supabase compatibility and staging remain
unverified; this PR is a fixture-backed candidate, not rollout approval.

Validation: dashboard security suite 41 passing runner tests; dashboard typecheck
and production build; unchanged shared contract typecheck/tests; diff whitespace,
path ownership and MBPR preservation checks. SQL covers two-org access, revoked
and viewer denial, publication permissions, scoped identity/FK constraints, worker
source ownership, receipts/digest conflicts, transaction rollback and invitation
expiry/reuse. PGlite serializes competing CAS statements; true multi-connection
contention, Auth token expiry/reuse and signed-URL expiry require staging HTTP.

Review `docs/platform-a-interfaces.md` for B/C/D requests. B must use receipt-first
transaction locking and commit animal, row outcome, receipt and checkpoint together.
C must register stable namespaces and pin mapping/file revisions. D must use the
trusted scoped NOLOGIN worker capability; credential resolution/deployment remains
a reviewed prerequisite. New org creation awaits actual schema reconciliation.

Publishing was blocked by inherited proxy connectivity. Fetch, remote A inspection
and push dry-run could not connect to proxy port 8080. Inspect any existing remote
A branch before pushing; never force overwrite it. Current metadata probes also
fail before HTTP; coordinator's previous 401 remains unresolved. Keep Stage 2
cutover gated on public-reader/submission replacements and staging evidence.
