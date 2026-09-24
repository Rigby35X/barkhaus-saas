# MBPR Site Refresh Migration

This branch ports the current `Rigby35X/mbpr-mockup` HTML refresh into BarkHaus's existing Astro tenant site.

## What changed
- The refreshed HTML/CSS is the MBPR visual source of truth.
- Shared `MBPRLayout`, header, and footer remove repeated page chrome.
- All current mockup pages now live as Astro routes.
- `/available-pups` server-renders animals for the resolved BarkHaus tenant.
- Existing `/animal-details/[id]` remains available for BarkHaus/Supabase animal profiles.
- `/our-animals` redirects to `/available-pups`.
- The home page uses the same dynamic animal source for featured pups.

## Animal data transition
`src/lib/public-animals.ts` is the website-facing adapter. It currently reads the tenant's Supabase animal rows when configured and falls back to the four mockup animals for design/dev continuity. This is the seam where the existing Cognito animals proxy can be normalized temporarily, without coupling page components to Cognito. Later BarkHaus/Supabase can become the sole source without another website redesign.

## Temporary media note
The homepage video is referenced from the mbpr-mockup repository so this migration does not duplicate a multi-megabyte binary through the GitHub contents API. Move it to the production tenant media/CDN before launch.

## Deliberately not removed
Older tenant-site integrations and APIs were not deleted in this migration. They should be audited separately so the MBPR refresh does not accidentally break BarkHaus admin/integration work.
