# MBPR Form 49 preview integration

## Astro preview (site-0-beta)
The MBPR Astro routes already use `src/lib/public-animals.ts` for the home page,
available-pups grid, and individual profiles. This branch adds a form guard.

In the **Preview** environment for the Astro Vercel project set:
- `PUBLIC_ANIMALS_API_BASE`: the stable alias of the **working Form 49 animals-proxy preview** (no trailing slash)
- `PUBLIC_ANIMALS_EXPECTED_FORM_ID`: `49`

Redeploy this branch. Do **not** set these in Production. Verify:
1. `/available-pups` lists Naomi, Muffin, Luke, Bo, Doris.
2. `/available-pups/dog-49-1` shows Naomi and gallery images.
3. Repeat for `dog-49-2`, `dog-49-3`, `dog-49-4`, `dog-49-6`.
4. Homepage featured animals link to those Form 49 detail pages.
5. Check empty/error behavior and mobile layout.

## Shopify migration (not executed)
The animals-proxy feature branch includes authenticated, **read-only**
`GET /api/sync/form49-plan` (requires `Authorization: Bearer <SYNC_SECRET>`).
It lists Form 49 animals and known legacy Form 38 keys. It does not read or
modify Shopify.

Existing Shopify product handles and IDs must be inventoried against the
store before implementing any writes. Preserve existing product handles and
redirects where possible. The existing `/api/sync/run` uses the old flat
Cognito schema, looks up products by dog name, and can replace images; it
**must not** be used for the Form 49 migration without a reviewed rewrite.
Never run live Shopify mutations as part of a preview deployment.

## Production launch blockers
- Confirm Astro preview points to Form 49 proxy and all routes/photos work.
- Verify legacy Form 38 URL behavior; do not infer redirects by entry number.
- Compare existing Shopify products/handles and choose update-vs-create per dog.
- Add a separate explicit-approval Shopify mutation workflow with a dry-run
  and idempotent ID mapping, then validate it on a test store or test products.
- Keep Cognito OData tokens and Shopify credentials server-side.
