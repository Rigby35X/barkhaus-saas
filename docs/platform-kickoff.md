# BarkHaus platform kickoff

## Goal and first milestone
BarkHaus is a reusable rescue platform. MBPR is a test customer, not the product architecture.
Support (1) native management after CSV import/manual entry and (2) keeping existing animal software connected.
First milestone: two synthetic rescue organizations, one native and one externally connected, use the same animal dashboard and public-record contract without tenant-specific code.

## Baseline
Start from feature/dashboard-workspace-foundation-20260929, including PR #5.
At preparation, its head is 5cb19f43516b046d87c74dcb318ad185ed8e4ec4.
Recheck the latest branch head before starting. Do not restart from main and lose the draft Auth/routing changes.
Dashboard is React/Vite/TypeScript; tenant sites and marketing are separate Astro apps.
Read apps/dashboard/README.md and SECURITY_ROLLOUT.md.
Live Supabase schema and policies have not been verified. Prepared migrations are not production rollout evidence.
Preserve MBPR Form 38 / animals-proxy / stable public keys / existing Shopify integration.
No production cutover is part of the first implementation assignments.

## Coordinator: first task
1. Inventory actual animal schema, API helpers, imports, server routes, current tests and connector code.
2. Reproduce install, application typecheck, security tests and builds; record baseline issues separately.
3. Produce versioned TypeScript contracts and a mapping from existing database columns to them.
4. Agree the contract below with all workers before parallel implementation; existing data types must be reconciled, not blindly replaced.
5. Designate a single schema/migration owner. Workers request schema changes instead of independently changing shared tables.
6. Assign isolated branches/worktrees with exclusive file ownership.
7. Review and integrate small PRs, then test combined behavior against two organizations.

## Initial contract decisions (implementation must reconcile existing schema)
- Preserve current organization IDs; every private record has an organization association enforced on the server/database.
- Animal identity is a stable internal ID; name is never identity.
- Each record has a primary source: native, CSV import transitioning to native, or a specific connector.
- Connector identity includes organization, connection ID, and external record ID. Enforce uniqueness within that scope.
- CSV onboarding requires a stable import key for repeat matching; absent keys require explicit create-only or reviewed matching. Never match automatically on name alone.
- Separate lifecycle status (intake, care, adopted, etc.), adoption availability, and publication state. Freeze exact enums after inventory.
- Define public profile fields explicitly: name, species, breed, age/birthday rules, sex, size, biography, approved photos, availability, and public profile key.
- Internal notes, medical records, adopter/contact information and sensitive documents are private and excluded from public responses.
- Track source ownership per mapped field. External sync updates only external-owned fields; BarkHaus notes/applications/publication controls survive sync.
- A public profile key is independent of internal IDs; preserve MBPR's existing dog-{formId}-{entryNumber} keys through adapters.
- Native edits require authorization and concurrency protection; document conflict behavior instead of silently overwriting a newer record.
- External connections are one-way inbound initially. No implicit external writes.
- Missing records in a feed do not imply deletion. Mark sync state for review; explicit validated source status can change availability.
- Public publication is deliberate; newly imported records start unpublished by default.
- Custom fields and saved mappings handle customer variation; no hardcoded organization IDs or default MBPR endpoint.
- Credentials stay server-side and outside source control.

## Agent assignments

### A: identity, staging and schema ownership
Own membership/account flows, staged migrations, private storage policies and permissions tests.
Reconcile actual schema when authorized access is available; otherwise provide a read-only preflight and test against local fixtures.
Complete password recovery and invitation/provisioning design, enforce owner/admin/staff/viewer.
Own all shared SQL migrations after coordinating animal/import/connector requirements.
Accept when authenticated users cannot cross organization boundaries, viewers cannot write, revoked access is denied, public callers cannot retrieve private fields, and account provisioning cannot self-promote.
Deliver staged code/migrations and test evidence. Report live deployment as blocked until verified rather than claiming it complete.

### B: native animal management
Own animal service/repository, animal editor and related components; consume frozen shared contracts.
Implement create/edit/archive, statuses, photo ordering and private-document access with explicit read/write rules.
Show read-only source-owned fields on connected animals; permit BarkHaus-owned annotations.
Keep external side effects out of UI helpers.
Accept when a native record survives reload, edits stay scoped to its organization, concurrent-edit conflicts are visible, and unpublished/private fields never appear in public output.

### C: CSV onboarding
Own CSV parsing/mapping/preview/validation/import UI and import services.
Support BOM/quoted fields, row-level errors, required-field validation, saved field mappings, status mapping, stable import keys and explicit duplicate resolution.
Execute writes through an authorized server-side service in bounded batches; enforce file/row limits.
Track job progress, row outcomes and retries. Retrying a job must not duplicate completed records.
Reject unapproved/unsafe photo downloads; remote-photo ingestion needs a separate vetted fetch path.
Accept when a valid fixture imports, malformed rows are explained, repeated imports update intended records, and partial retries do not duplicate them.
No external-provider connector implementation in this assignment.

### D: connector framework and Cognito adapter
Own connectors and sync orchestration; consume the shared animal write interface and schema owned by A.
Define capabilities, credential references, field mappings, external identity, pagination/cursors, job state, retries and sanitized logs.
Use an asynchronous job design with a documented scheduler/worker deployment; a browser tab must not be the sync worker.
Implement Cognito normalization from synthetic fixtures first, adapting existing working MBPR behavior without changing production.
Treat feed failures separately from valid empty feeds; retries must be idempotent.
Accept when repeated sync creates no duplicates, mappings translate statuses, invalid credentials show actionable errors, and disconnected sources preserve BarkHaus-owned information.
Implement Google Sheets as the next adapter only after framework/Cognito acceptance. Do not advertise unsupported providers as connected.

## File and branch coordination
- Each agent creates a task branch from the same agreed baseline, then rebases onto approved shared-contract updates.
- Coordinator owns shared contracts, app navigation composition and dependency/lockfile changes.
- A owns shared migrations. B/C/D request additions through the coordinator.
- Workers own module-specific files; no shared checkout edits without coordination.
- Backend imports/connectors must use the same authorized animal-write rules; do not create parallel incompatible APIs.
- End each assignment with commit/PR references, changed files, checks, assumptions and remaining blockers.
- Local fixture success is distinct from staging success and production success.

## Later implementation rounds
1. Organization setup flow combining signup, unique slug, source choice, branding and starter website.
2. Public animal read API, draft/preview/publish workflow, website theme/content editing and domain resolution.
3. Applications/contacts with animal linkage, assignments, notes, status history and notifications.
4. Google Sheets connector; additional providers after capability/API review.
5. Authenticated AI drafts, saved marketing assets and exports.
6. Payments/donations/subscription billing after payment account model is settled.
7. Events, social scheduling and advanced automation.
8. Operational launch: monitoring, backups/restore, mobile/accessibility testing, support tools and production rollout.

## First milestone acceptance script
- Org A imports synthetic animals, fixes invalid rows and retries with no duplicates.
- Org A edits a native animal and deliberately publishes only approved profile fields.
- Org B syncs synthetic connector records, changes a source record and syncs again.
- Source updates preserve BarkHaus-owned notes and publication controls.
- Both organizations use the same dashboard/public interfaces.
- Cross-org users and anonymous callers fail private access tests.
- Refresh and browser history retain organization/tab routing.
- Existing MBPR public integration remains unchanged.
- Coordinator reports fixture, staging and production verification separately.

## Cloud task launch instructions
Select a published Codex Cloud environment containing the repository, dependencies and needed test tools.
Complete setup/access prompts before unattended work. Do not rely on a laptop browser session.
Start the coordinator contract/baseline task first; launch A alongside it for read-only security inventory.
Launch B/C/D implementation after the shared-contract commit exists.
Stop at reviewable changes and documented blockers. Production rollout is a separate task.
