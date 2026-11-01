# Next implementation assignments: native management and CSV first

**Execution update:** the bounded A–D runtime pass described here has now run on the coordinator integration checkout. See [platform-round1-status.md](platform-round1-status.md) for implemented files, test evidence and exact remaining gaps. Do not relaunch these completed bounded tasks or mistake them for Round 1 acceptance.

This continues [the kickoff](platform-kickoff.md) and [PR #11](https://github.com/Rigby35X/barkhaus-saas/pull/11); it does not restart the four original branches. The first A–D implementations and cross-module atomicity repairs are integrated locally. Both administrator metadata exports are received. Hosted staging acceptance, runtime binding and production rollout are not complete.

## Product scope

Every rescue chooses **Manage in BarkHaus** (manual entry or CSV) or **Connect existing software** (a deliberately supported provider). Both use the same normalized animal model, dashboard and future website/application/marketing contracts. One animal has one primary source, with explicit ownership of mapped fields; sync is one-way inbound unless a future provider explicitly supports reviewed write-back.

Cognito is the current configured source for Mission Bay Puppy Rescue. It is not a required onboarding step, global provider default, default form ID, default endpoint or organization-specific platform architecture. The connector framework can support configured Cognito connections for other organizations after acceptance, without making Cognito mandatory. Google Sheets is the next adapter after native/CSV and framework/Cognito acceptance. Unsupported providers must not appear connected.

The first complete demonstration is: create a synthetic organization → choose manual or CSV → map/preview/fix records → repeat import without duplicates → edit and reload → deliberately publish approved fields. A connected-organization demonstration follows. Complete organization signup/slug/source-choice orchestration and website launch are the next product round; the current feature modules are not that full onboarding flow.

Disconnecting currently preserves records and local information. It must not be described as a completed switch to native ownership. A future explicit “Manage in BarkHaus” transfer needs a reviewed atomic ownership transition, stopped/fenced sync jobs, preserved identities/history, confirmation of affected fields and replay/concurrency tests.

## Baseline, ownership and safety gates

The frozen follow-up implementation baseline for **all four agents A, B, C and D** is `6c0429d72c904f3f03b7452e911f8f64585e7b44`. It contains the identity/legacy migration split and the passing combined regression suite. Create each follow-up branch from this exact commit and verify `git rev-parse HEAD`. A later documentation-only handoff commit pins this SHA; copy the current assignment into each task launch message. Do not relaunch from `813d605`, an old worker head or an unreviewed PR merge ref. This document does not claim the next four Cloud tasks are running.

The coordinator owns `supabase/migrations/**`, `supabase/staging/**`, `supabase/audits/**`, `shared/contracts/**`, dependency manifests/lockfiles, `apps/dashboard/src/App.tsx`, `apps/dashboard/src/components/Sidebar.tsx`, onboarding/navigation composition and shared integration-test infrastructure. SQL requests from every agent go through this one owner. A reviews identity/schema changes but does not independently edit shared migrations during this handoff. Transfer exact files in the tracker before changing this division.

Do not apply remote migrations, provision remote roles/users, merge PR #7/#11, deploy or enable runtime writes/providers in these assignments. Local factories/harnesses and proposed deployment files are permitted. A future hosted run requires separately authorized staging access and the reviewed commit/sequence. Production, MBPR Form 38/proxy/public keys and Shopify remain unchanged. The 20-of-21 legacy public-table RLS gap needs a coordinated security/public-site cutover; do not blanket revoke production access or add blanket anon policies.

## A — identity, authorization and migration review

Branch suggestion: `feature/platform-a-staging-identity-v2`.

Own `apps/tenant-site/src/lib/dashboard-auth.ts`, `apps/dashboard/src/lib/{auth,access}.ts`, `apps/dashboard/src/hooks/useOrganizationSession.ts`, `apps/dashboard/src/components/LoginScreen.tsx`, `apps/dashboard/src/features/identity/**`, `apps/dashboard/tests/{access,rls,server-auth}.test.mjs`, `apps/dashboard/SECURITY_ROLLOUT.md` and a new module-specific identity acceptance test. Coordinate changes to coordinator-owned shared tests before editing them.

Review the additive identity foundation and hosted defaults against both exports. Supply verified member resolution to B, review scoped role delegation/workload requirements with D, and prepare synthetic Auth/recovery/invitation/private-storage acceptance. Keep legacy-table RLS/storage-policy cutover separate from additive platform setup.

Acceptance:

- The platform-only sequence leaves legacy table grants, RLS, policies and synthetic public reads/submissions unchanged; it does not claim to remediate their existing exposure.
- Two organizations: owner/admin/staff/viewer/revoked actors cannot cross membership boundaries or self-promote. Native writer, executor and connector role remain NOLOGIN/NOBYPASSRLS with no browser/service-role membership.
- Invitation/recovery redirects, expiry/reuse and membership revocation before commit are tested. Private documents remain inaccessible through public image storage.
- Identify hosted-only requirements separately; no fixture result is called a live Auth/Storage pass.

Gate: additive foundation review and coordinator contract freeze before B's runtime binding. A can continue identity harnesses while other modules use the frozen interface.

## B — finish the native management route

Branch suggestion: `feature/platform-b-native-runtime-v2`.

Own `apps/tenant-site/src/services/animals/**`, `apps/tenant-site/src/pages/api/v1/animals/**`, `apps/dashboard/src/features/animals/**`, `apps/dashboard/src/lib/api.ts` (animal exports only), `apps/dashboard/src/lib/upload.ts`, `apps/dashboard/src/tabs/{AnimalsTab,AnimalModal}.tsx`, `apps/dashboard/src/components/{AnimalForm,MBPRPuppyForm,PawsAnimalForm,PawsAnimalList}.tsx` and `apps/dashboard/tests/animals/**`.

Prepare the concrete server pool/factory configuration and verified member binding behind the existing gate, plus an opt-in local synthetic harness. Finish native create/edit/archive/status/photo/private-document integration and UI error/reload behavior. Keep transaction ownership and API contracts shared with C/D. Do not independently remove the deployed 503 gate.

Acceptance:

- Native create → reload → edit survives persistence, with two organizations and same-name distinct animals. Viewer/revoked/cross-org requests fail beyond the UI.
- Two independent SQL connections editing revision N produce one accepted update and one visible conflict; attempted input survives conflict. Lost commit acknowledgement replays the same command once.
- Only owner/admin deliberately publish approved profile/photo data. Private notes/documents/custom data never enter public responses. Source-owned fields are visibly read-only; local annotations survive sync.
- Photos/private attachments use reviewed storage access; incomplete upload or stale revision cannot silently publish or overwrite. Browser refresh/history keeps the authorized organization.

Gate: A's identity contract and coordinator's additive schema approval. C/D consume B's existing shared transaction; neither writes animals through a separate repository.

## C — connect the CSV experience end to end

Branch suggestion: `feature/platform-c-csv-runtime-v2`.

Own `apps/dashboard/src/features/imports/**`, `apps/tenant-site/src/services/imports/**`, proposed `apps/tenant-site/src/pages/api/v1/imports/**` and `apps/dashboard/tests/imports/**`. Coordinator owns mounting the UI in the onboarding/workspace navigation. Propose new route files and their verified authorization before any mounting.

Supply a real persistent `CsvOnboardingClient`, authorized server endpoints and supervised bounded-job execution using B's transaction. Keep mapping, source file/seal, matching decisions and initiator pinned per job. Prepare native CSV onboarding independently of any provider.

Acceptance:

- Template download/manual fixture → mapping → preview without writes → confirm → durable progress/results → reload/recovery works. Quoted fields, missing fields and unknown statuses show precise errors.
- Stable-key reimport updates intended records; duplicate/ambiguous matches require explicit review. Correction uses a new reviewed job; retry resumes the original immutable job without duplicates.
- Failure at the final checkpoint rolls back all animals, identities, outcomes, receipts and progress for that batch. Acknowledgement loss followed by replay creates one durable result.
- File/row limits, forbidden photo fetching, viewer/revoked/cross-org attempts and source-owned field conflicts are enforced server-side. New imports remain unpublished.

Gate: A + B reviewed interfaces. Parser/UI work can proceed concurrently; hosted endpoint/job activation waits for combined native acceptance and explicit runtime authorization.

## D — generic connector controls, then configured Cognito

Branch suggestion: `feature/platform-d-connector-runtime-v2`.

Own `apps/tenant-site/src/services/connectors/**`, proposed `apps/tenant-site/src/pages/api/v1/connectors/**`, `apps/dashboard/src/features/connectors/**`, `apps/dashboard/tests/connectors/**` and `deploy/connectors/**`. Coordinator owns Integrations-tab/navigation mounting and shared SQL. Request the authenticated member/control boundary from A and writer transaction from B.

Prepare scoped workload authentication, private secret resolution and durable outbox/queue/reaper deployment adapters without deploying them. Build connection controls for mappings, last successful sync, sanitized errors, reconnect and disconnect. Configure Cognito explicitly per connection; keep MBPR's production path untouched. Do not start Sheets until framework/Cognito acceptance.

Acceptance:

- No global organization/form/endpoint defaults. Same external IDs in distinct organizations/connections stay distinct; credentials/private source bodies are absent from browser status and logs.
- Browser closes while worker can finish; bounded retries, cancellation, stale fences/generations and revoked workload fail safely. Valid empty feeds differ from failures; missing animals are reviewed rather than deleted.
- Animal changes, identities, outcomes, source history and authoritative cursor commit together. Checkpoint failure rolls back the whole page; lost acknowledgement/replay and expired post-commit leases preserve one completed result.
- Source updates preserve BarkHaus-owned notes, publication and photo approvals. Disconnect preserves records, fences pending work and does not silently transfer field ownership.
- Review the provider's real pagination/revision/snapshot envelope before enabling snapshot completion; fixtures alone do not establish live Cognito semantics.

Gate: A + B transaction/identity contracts; connector hosted demonstration follows native/CSV acceptance. No configured Cognito connection is required for a native rescue.

## Coordinator integration sequence

1. Freeze the additive identity/legacy boundary and prove legacy-access preservation locally. Update the staged allowlist; keep remote execution outstanding.
2. Review A's identity/delegation handoff, then B's native runtime harness. Integrate C's persistent client/job endpoints and complete a native/CSV demonstration using two synthetic organizations.
3. Review D's controls/deployment adapters and run the connected-organization demonstration against the same shared contracts.
4. After authorized staging configuration/migrations, repeat with real Auth/Storage and independent PostgreSQL connections. Check browser routing, public/private projection, rollback/replay and preserved MBPR dependencies before any gate removal or merge decision.
5. Plan round two: reusable organization onboarding, safe public animal API/website publishing, applications/contacts and Sheets. Later email/marketing/payments/automation and launch operations remain separate milestones; local first-round completion is not full BarkHaus completion.

Each handoff includes exact base/head SHA, changed files, tests and results, deployment assumptions, outstanding hosted checks and ownership requests. Keep one consolidated integration report instead of independently merging old worker PRs.
