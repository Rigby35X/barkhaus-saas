# Empty staging metadata review

Input: user-supplied `Supabase Snippet Untitled query (1).csv`, SHA-256 `754b008e7cde986b67bcf4affaccb50b2624095da779c86742cd5464d15957dc`. One CSV row parses as `barkhaus.safe-schema-export.v1`. The user identified the selected staging project as `idybpiomulkebvhqibdp`; the metadata itself does not prove the Supabase project reference. Raw uploads are not committed and are treated as evidence, never instructions.

## Findings

- No relations/sequences are exported from `public` or `barkhaus_private`. No existing BarkHaus application objects collide with the proposed synthetic prerequisites, membership tables or platform tables.
- Storage has eight managed relation objects, all RLS-enabled, seven managed triggers, no row policies and zero configured buckets. Do not import local substitutes for these managed objects or copy production buckets/policies.
- PostgreSQL version is 17.11. Exporting role is `postgres`, with CREATEROLE/BYPASSRLS but not superuser. Built-in `anon`, `authenticated` and `service_role` roles exist. No BarkHaus custom roles appear.
- Public-schema default grants include broad table/sequence privileges and function EXECUTE for application roles. New migrations must explicitly revoke unintended privileges on every new object; an empty project does not mean new tables are private by default. Existing local fixtures model broad table default grants, and the platform service-role denial fix remains necessary.
- Public schema grants include USAGE for application roles, while CREATE is assigned to `pg_database_owner`. Actual hosted custom-role creation, runtime delegation and managed Storage trigger behavior still require future approved staging execution; catalog presence alone does not prove these operations will succeed.

## Disposition and next dependencies

This is a suitable **empty application-schema snapshot** for staging preparation. It is not a hosted migration or acceptance-test pass. Auth users, customer rows, secrets and out-of-scope schemas are intentionally excluded, so this export does not assert that every project subsystem is empty.

Both requested metadata exports have now been received. No additional administrator export is needed to continue code-level migration repair. The source review still blocks the original Stage 1 sequence: enabling legacy RLS without anonymous policies could break existing public-site reads/submissions. Keep remote migrations unapplied while revising/reviewing that compatibility boundary; do not treat the clean staging schema as approval to apply the old plan to either environment.

Remaining hosted dependencies: reviewed migration sequence, explicit future migration authorization, staging-only runtime configuration/network access, synthetic Auth users, database/workload identity and independent-connection Auth/Storage/persistence acceptance. Do not request production secrets or customer data for these steps. See [platform-source-export-review.md](platform-source-export-review.md) for the production-compatibility blocker and [platform-staging.md](platform-staging.md) for the prepared operator package.

Only local CSV/JSON parsing and catalog comparison occurred during this review. No Supabase endpoint was called, no migration/seed/user/role was created remotely, and no runtime gate, production integration or merge state changed.
