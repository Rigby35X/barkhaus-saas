# BarkHaus dashboard

The rescue workspace lives in `apps/dashboard` (React 19, Vite, TypeScript). It is separate from `apps/marketing` and the Astro `apps/tenant-site` public websites.

## Current behavior

- Login uses Supabase Auth and active organization memberships; frontend access codes are removed. See [SECURITY_ROLLOUT.md](SECURITY_ROLLOUT.md) for staged RLS migration and deployment prerequisites.
- The overview reads the selected organization's animals and applications from Supabase and shows loading, empty, and retry states independently. Its application queue is read-only; processing happens in Applications.
- Animals, applications, website content, communications, and other tabs contain existing management workflows. Their coverage and data sources vary; a visible tab does not by itself mean the whole feature is finished.
- MBPR's live public animal catalog still comes from Cognito Form 38 through `animals-proxy`. The dashboard's Supabase `animals` table is a separate source today. Editing a dashboard animal does not update the MBPR Astro site until a deliberate migration or sync is built and verified.

## Local development

```bash
cd apps/dashboard
npm ci
npm run dev
npx tsc -p tsconfig.app.json --noEmit
npm run build
npm run test:security # Node 22.18+; auth and real Postgres RLS regression checks
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for connected data. The public anon key is not an authorization mechanism; access must be enforced by Supabase RLS or a server endpoint. Do not place a service-role key in a `VITE_` variable.

## Rebuild sequence

1. **Identity and tenant access:** Auth and membership-based switching are implemented. Apply and verify the staged migrations against the actual Supabase schema, provision verified memberships, and complete the public-site access cutover described in SECURITY_ROLLOUT.md before production rollout.
2. **Animal record:** Define the canonical BarkHaus animal fields, stable identity, status transitions, photos, medical/private fields, and publication rules. For MBPR, plan a safe migration from Cognito rather than writing back into the current public proxy or legacy Shopify sync.
3. **Applications:** Connect each submission to the relevant animal and organization. Build a review queue, notes, and status history with tenant-scoped writes and appropriate private-data permissions.
4. **Website builder:** Make public page content, brand settings, forms, and animal availability previewable and publishable from the dashboard, with a verified tenant-site read path.
5. **Marketing and integrations:** Generate reusable copy from the animal record; treat scheduling and third-party distribution as explicit actions with visible state and error handling.

The immediate dashboard overview change is a small, reviewable read-only step. It does not change the MBPR public site or Cognito integration.
# Workspace URLs

The dashboard uses React Router under one app origin. Each tab has a URL such as
`/mbpr/animals` or `/mbpr/applications`. The organization segment uses the
database organization's `subdomain` field; keep these slugs unique and stable.
Organizations without a valid slug use `/org-{id}/overview`.

Routes resolve only against verified active memberships. Unknown organizations,
ambiguous slugs, and invalid pages fail closed. Direct links retain their path
through sign-in, and browser Back/Forward and refresh retain the current page.
Root, `/login`, and legacy `/dashboard` entry paths redirect signed-in users to
their remembered authorized organization or first available membership.
Switching organizations opens that organization's overview. Management routes
remain limited to owners/admins. Vercel's existing SPA rewrite serves deep links.
