# site-0 access compatibility

Base: e995a851e7d90140b59e6b9cfcc955071e9470ea, verified READY production deployment dpl_AE4jV3y69vRcHGH36rzvwgLSeon2.

This is a narrow tenant-data/API security patch over the exact deployed site-0 baseline. It does not replace the Cognito MBPR design with the shared generic website. The homepage, available-pups page, public-animals.ts (animals-proxy/Cognito client), FeaturedAnimals.astro and AnimalCard.astro retain byte-identical deployed Git blob hashes:

- apps/tenant-site/src/lib/public-animals.ts: f5acb5156f00db823a143b1933ffc9f7772b4868
- apps/tenant-site/src/pages/index.astro: 1805e3b8f45bcfc694fca2aad34a8836748c50f1
- apps/tenant-site/src/pages/available-pups.astro: e687b50baf2b7b3410498ac7ce1d1bbf7512ffa7
- apps/tenant-site/src/components/mbpr/FeaturedAnimals.astro: 4c66d52be5c5a0702f59bbf59088b29a9b0dc7dc
- apps/tenant-site/src/components/mbpr/AnimalCard.astro: b16e9baaa39791df460b44ae9c95c42da39dd146

Changes: public projections for public Supabase reads, verified membership/JWT authorization for admin routes, server-only adoption submission and quota, image authorization, and dynamic published footer contacts. Existing Cognito credentials, form IDs, animals-proxy URLs and animal presentation are untouched. Tests and migrations are included for review; deployment does not apply database migrations automatically.
