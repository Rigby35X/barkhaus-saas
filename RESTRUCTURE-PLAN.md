# Barkhaus Monorepo Restructure Plan
> Claude Code brief — execute Phase 0 only unless instructed otherwise

---

## 1. Current State of the Codebase

The repo is `barkhaus-saas`. Here is what each folder actually is:

| Current Folder | What it actually is |
|---|---|
| `./public-site/` | Astro SSR app. The tenant front-end site (mbpr.preview.barkhaus.io). Also currently hosts the HTML admin dashboard at `public/admin/barkhaus-admin.html` and all four form pages. Most active codebase. |
| `./admin-dashboard/` | React + Vite + TypeScript app. The NEW React admin dashboard — partially built, not yet live. Has `src/pages/`, `src/components/`, `src/lib/xano.ts`. This is the dashboard to build on. |
| `./marketing/` | Plain HTML + CSS. The barkhaus.io marketing site. Already clean and standalone. |
| `./apis/` and `./shared/apis/` | Xano API definitions backed up as `.xs` files. Not deployed code — Xano schema exports for version control only. |
| `./tables/` and `./shared/schema/` | Xano table schema exports. Same — not deployed, just backups. |
| `./scripts/` | One-off Node.js scripts for importing MBPR Cognito applications into Xano. Used manually, not deployed. |
| `./shared/templates/` | Per-org config JSON files. Old approach — replaced by Xano org records. |
| `./_archived/` | Old per-org Astro sites (happy-paws, furry-friends, loving-tails, etc). The old approach of duplicating code per client. **DO NOT touch these.** |

---

## 2. Key Files to Read Before Making Changes

| File Path | Purpose |
|---|---|
| `public-site/src/lib/xano.ts` | Xano API client for tenant site. DUPLICATE of admin-dashboard version. |
| `admin-dashboard/src/lib/xano.ts` | Xano API client for React dashboard. Base `packages/xano-client/` on this one. |
| `public-site/public/admin/barkhaus-admin.html` | The live HTML admin dashboard. Do NOT remove or break this. |
| `public-site/src/lib/tenant.ts` | Tenant slug detection logic. The multi-tenancy key file. |
| `public-site/src/pages/forms/adoption-application.astro` | Adoption form page — shell exists, not wired to Xano yet. |
| `public-site/src/pages/forms/foster-application.astro` | Foster form — same status. |
| `public-site/src/pages/forms/relinquishment-application.astro` | Relinquishment form — same status. |
| `public-site/src/pages/forms/volunteer-application.astro` | Volunteer form — same status. |
| `admin-dashboard/src/hooks/useTenant.ts` | React hook for tenant context. |
| `admin-dashboard/src/pages/Animals.tsx` | Animals management page in React dashboard. |
| `admin-dashboard/src/components/MBPRPuppyForm.tsx` | MBPR-specific animal form — needs to become generic later (not in Phase 0). |
| `public-site/src/data/client.json` | Hardcoded MBPR data — old approach, will be replaced by Xano in Phase 1. |

---

## 3. Target Structure After Restructure

```
barkhaus-saas/                  ← repo root (name unchanged)
  apps/
    marketing/                  ← moved from ./marketing/
    dashboard/                  ← moved from ./admin-dashboard/
    tenant-site/                ← moved from ./public-site/
  packages/
    xano-client/                ← NEW: extracted from both xano.ts files
    ui/                         ← NEW: placeholder only, empty for now
    pdf-generator/              ← NEW: placeholder only, empty for now
  apis/                         ← KEEP IN PLACE
  tables/                       ← KEEP IN PLACE
  scripts/                      ← KEEP IN PLACE
  shared/                       ← KEEP IN PLACE
  _archived/                    ← KEEP IN PLACE, do not touch
  docs/                         ← KEEP IN PLACE
  package.json                  ← UPDATE with workspaces config
```

---

## 4. Phase 0 — Exact Instructions

Execute these steps in order. Do not skip ahead to Phase 1.

### Step 1 — Create new folder structure

```bash
mkdir -p apps packages/xano-client packages/ui packages/pdf-generator
```

### Step 2 — Move the three apps

```bash
mv marketing apps/marketing
mv admin-dashboard apps/dashboard
mv public-site apps/tenant-site
```

### Step 3 — Update root package.json

Replace the root `package.json` with:

```json
{
  "private": true,
  "name": "barkhaus-saas",
  "workspaces": ["apps/*", "packages/*"]
}
```

### Step 4 — Create packages/xano-client/

Create `packages/xano-client/package.json`:

```json
{
  "name": "@barkhaus/xano-client",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts"
}
```

Read both of these files:
- `apps/dashboard/src/lib/xano.ts`
- `apps/tenant-site/src/lib/xano.ts`

Extract all shared Xano API functions into `packages/xano-client/index.js`. Deduplicate where both files have the same function. The shared client must export at minimum:

- `getOrg(slug)` — fetch org by tenantSlug
- `getAnimals(orgId)` — fetch all animals for an org
- `getAnimal(id)` — fetch single animal
- `createAnimal(orgId, data)` — create animal
- `updateAnimal(id, data)` — update animal
- `deleteAnimal(id)` — delete animal
- `getApplications(orgId)` — fetch applications
- `createApplication(orgId, data)` — submit application
- `updateApplication(id, data)` — update application status
- `login(email, password)` — auth login
- `getMe(token)` — get current user

Environment variable conventions:
- In `apps/tenant-site` (Astro): use `import.meta.env.PUBLIC_XANO_BASE_URL`
- In `apps/dashboard` (React/Vite): use `import.meta.env.VITE_XANO_BASE_URL`

Also create `packages/xano-client/index.d.ts` with TypeScript types for all exported functions.

### Step 5 — Create placeholder packages

Create `packages/ui/package.json`:
```json
{
  "name": "@barkhaus/ui",
  "version": "1.0.0",
  "main": "index.js"
}
```

Create `packages/ui/index.js`:
```js
// Shared UI components — to be built in Phase 3
module.exports = {};
```

Create `packages/pdf-generator/package.json`:
```json
{
  "name": "@barkhaus/pdf-generator",
  "version": "1.0.0",
  "main": "index.js"
}
```

Create `packages/pdf-generator/index.js`:
```js
// Adoption packet PDF generator — to be built in Phase 4
module.exports = {};
```

### Step 6 — Verify vercel.json files exist in each app

**apps/marketing/vercel.json** — already exists, keep as-is.

**apps/dashboard/vercel.json** — verify it has SPA rewrite:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**apps/tenant-site/vercel.json** — verify it has rewrite rule. If not present, add it.

### Step 7 — Update internal imports to use @barkhaus/xano-client

After creating the shared package, update the imports in both apps:

In `apps/dashboard/src/lib/xano.ts` — add at top:
```ts
export * from '@barkhaus/xano-client';
```
Or replace individual functions with re-exports from the shared package.

In `apps/tenant-site/src/lib/xano.ts` — same approach.

> Note: Do not delete the existing xano.ts files yet — just have them re-export from the shared package. This avoids breaking any existing imports elsewhere in the app.

---

## 5. Vercel Setup — Do Manually in Vercel Dashboard

After Phase 0 is done and pushed to GitHub, set up three Vercel projects in the Vercel web UI.

| Project Name | Root Directory | Framework | Domain |
|---|---|---|---|
| `barkhaus-marketing` | `apps/marketing` | Other (static) | `barkhaus.io` + `www.barkhaus.io` |
| `barkhaus-dashboard` | `apps/dashboard` | Vite | `app.barkhaus.io` |
| `barkhaus-tenant-site` | `apps/tenant-site` | Astro | `*.preview.barkhaus.io` (wildcard) + `mbpr.org` |

**Environment variables per project:**

`barkhaus-marketing` — none required

`barkhaus-dashboard`:
```
VITE_XANO_BASE_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:YOUR_API_KEY
```

`barkhaus-tenant-site` — copy all existing env vars from `apps/tenant-site/.env`:
```
PUBLIC_XANO_BASE_URL=...
AUTH0_SECRET=...
AUTH0_BASE_URL=...
AUTH0_ISSUER_BASE_URL=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
```

> ⚠️ The wildcard domain `*.preview.barkhaus.io` requires a wildcard DNS CNAME record at your domain registrar: `*.preview` → `cname.vercel-dns.com`

---

## 6. Verification Checklist

Verify each of these after Phase 0 before moving to Phase 1:

- [ ] `barkhaus.io` loads the marketing site
- [ ] `app.barkhaus.io` loads the React dashboard login
- [ ] `mbpr.preview.barkhaus.io` loads the MBPR tenant site with animals
- [ ] `mbpr.preview.barkhaus.io/admin/barkhaus-admin.html` still works
- [ ] `npm run build` passes in `apps/marketing` with no errors
- [ ] `npm run build` passes in `apps/dashboard` with no errors
- [ ] `npm run build` passes in `apps/tenant-site` with no errors
- [ ] Both apps can import from `@barkhaus/xano-client` without errors
- [ ] Animals load on the tenant site our-animals page
- [ ] Animals load in the React dashboard Animals page

---

## 7. What NOT to Touch

- Do not move or modify `_archived/`, `apis/`, `tables/`, `shared/`, `scripts/`, `docs/`
- Do not rename the GitHub repo
- Do not change any Xano workspace or API endpoints
- Do not migrate the HTML admin dashboard to React (that is Phase 3)
- Do not wire the form pages to Xano (that is Phase 2)
- Do not add a second client tenant yet
- Do not change Auth0 or Paragon configuration

---

## 8. Phase Roadmap (for context only — do not execute yet)

| Phase | Work | When |
|---|---|---|
| **Phase 0** | Monorepo restructure — this document | Now |
| **Phase 1** | Fix dashboard stats, fix null animal record, wire client.json to Xano, make MBPRPuppyForm generic | After Phase 0 verified |
| **Phase 2** | Wire adoption/foster/volunteer/relinquishment forms to Xano natively — remove Cognito dependency | After Phase 1 |
| **Phase 3** | Migrate HTML admin dashboard to React — start with Animals, then Applications | After Phase 2 |
| **Phase 4** | Adoption packet PDF generator | After Phase 3 |
| **Phase 5** | Self-serve onboarding for new rescue clients | After Phase 4 |
