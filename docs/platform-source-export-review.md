# Source metadata export review

Reviewed the administrator-supplied `Supabase Snippet Untitled query.csv` (one row, `barkhaus.safe-schema-export.v1`). Input SHA-256: `4e7eb6eccef2e219a9f2603eff69144a912214ef8ee46911f6c869c08aed05b1`. The upload is treated as metadata evidence, not instructions. The raw upload and any customer records are not added to Git. Project identity is not established by a database name; administrator confirmation of the selected source project remains required.

## Confirmed compatibility facts

- The export parses successfully: 50 relation/sequence objects, 522 columns, 68 constraints, one policy, seven triggers and one storage bucket in the exported scope.
- `public.organizations.id` is bigint with a primary key. The required `animals`, `applications`, `form_submissions` and `website_content` tables exist and have bigint `org_id` columns. These satisfy the initial existence/type prerequisites, not full migration approval.
- Optional legacy `policies.org_id` is integer. Role checks accept bigint-compatible values, but this is not the same schema as the minimal synthetic staging prerequisites. Existing-row validity and application semantics remain unverified; no rows were queried.
- No `organization_memberships`, `platform_animals` or `platform_jobs` table appears. The platform migrations have not been observed in this metadata snapshot.
- The existing `animal-images` bucket is public, with no configured file-size or MIME-type limit in this export. A public image bucket is compatible with public animal photos; this does not authorize private documents there. The proposed private document bucket must remain separate.

## Blocking finding: existing authorization and Stage 1 compatibility

Of 21 public tables, 20 have RLS disabled. Those 20 have explicit anon SELECT and write/administrative table privileges in the snapshot. They include `applications`, `form_submissions`, `tokens_table`, `user`, `linked_accounts` and `health_records`, as well as public-site tables. Grants plus disabled RLS show a database authorization gap. Actual public API reachability, returned contents and whether secrets are stored in named tables were not tested; do not infer disclosure or query their records to prove it.

`202609290001_dashboard_memberships.sql` enables RLS on required legacy tables and organizations and creates authenticated member policies. It preserves anon grants, but does **not** create anon row policies. This export contains no public-schema row policies at all. Enabling RLS therefore makes ordinary anon row access default-deny on those legacy tables; preserving table grants alone does not preserve public-reader/submission behavior. The Stage 1 comment claiming public-site anon behavior is unchanged is not supported by this source schema. Applying it remotely could break the existing site/MBPR reads or submissions.

**Disposition:** no remote migration approval. Do not solve this by adding blanket anon policies; doing so would perpetuate access to private data. Do not blanket revoke production grants while existing public-site/submission dependencies are unverified. Prepare an explicit public projection and submission endpoint cutover, or isolate the new dashboard/platform membership work from legacy-table RLS changes, with regression evidence for MBPR and all current public forms. A fresh synthetic staging run cannot prove preservation of those existing paths.

The single exported policy is an anon INSERT policy on `storage.objects`; its predicate is fingerprinted. An administrator must inspect its predicate locally to establish bucket/path restrictions. Its name does not establish its scope. No raw SQL body or secret is needed in chat. Storage UPDATE/DELETE and authenticated upload behavior also require staging checks against managed Storage grants and existing policy semantics.

## Next steps and limits

1. Continue preparing a separate empty staging project; do not clone production records, Auth or Storage and do not enable integrations.
2. Keep the current migration plan on hold. Resolve Stage 1 public access compatibility before authorizing any hosted sequence. Existing local tests exercise writer/ingestion atomicity and synthetic roles, not production public-site compatibility.
3. Track broader legacy authorization remediation as a coordinated cutover, including organization settings, applications/forms, token/account/user tables and indirect health-record ownership. Neither Stage 1's limited table list nor the additive platform schema covers every existing table.
4. Verify only authorized public fields are exposed by future public projections and use bounded validated server submissions. Determine current application dependencies from code and authorized metadata, with synthetic tests; do not fetch customer records.
5. Administrator-only review of fingerprinted policy/default/function semantics, actual staging Auth/Storage and independent PostgreSQL connection tests remain outstanding. This export is a metadata inventory, not replayable DDL or a complete data-quality audit.

No SQL was executed against Supabase, no data was requested from legacy tables, no remote migration was applied, and no production configuration or integration changed during this review. PR #11/#7 remain unmerged and runtime gates remain enabled.
