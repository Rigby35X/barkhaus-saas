# Barkhaus Phase 3.5 — Cleanup, Mobile Responsiveness & Performance

## Overview

This brief is for autonomous Claude Code execution. Run after Phase 3 (React dashboard build) is complete and building successfully. Three objectives:

1. Remove all Paragon/Mailchimp integration code (we are not using Paragon)
2. Make the admin dashboard fully mobile-responsive
3. Optimize tenant site and dashboard for fast load times

**Do not add new features.** This is a cleanup and polish pass only.

---

## Part 1: Paragon / Mailchimp Removal

### Files to modify

**`apps/dashboard/src/lib/api.ts`**
- Remove the `getMailchimpToken` function entirely
- Remove the `POST /api/admin/mailchimp-token` endpoint reference
- Remove any Paragon-related type definitions

**`apps/dashboard/src/tabs/CommunicationsTab.tsx`**
- Remove the entire Mailchimp/Paragon section
- Remove the Paragon SDK dynamic import (`import('https://cdn.skypack.dev/@useparagon/connect')`)
- Remove all Paragon state variables
- The Communications tab should ONLY contain the Form Submissions inbox
- Source: `GET https://xz6u-fpaz-praf.n7e.xano.io/api:0Mx5oX0z/submissions?org_id={orgId}`
- Filter by form type (contact/waitlist) and status (new/read/replied/archived)
- View modal with reply textarea + status update → PATCH to Xano

**`apps/dashboard/src/tabs/IntegrationsTab.tsx`**
- Remove any Paragon references
- Replace with a clean placeholder: "Integrations coming soon."
- Keep the tab in the sidebar

### Verification
- `npm run build` in `apps/dashboard/` must pass with zero errors
- Run: `grep -ri "paragon\|mailchimp\|skypack" apps/dashboard/src/` — should return nothing

---

## Part 2: Mobile Responsiveness — Admin Dashboard

The dashboard must be fully usable on screens down to 375px wide.

### Sidebar
- On mobile (< 768px): sidebar is hidden by default, shown via hamburger menu toggle
- Hamburger button appears in the top-left of the header on mobile
- Sidebar slides in as an overlay with a dark backdrop
- Tapping the backdrop or a nav item closes the sidebar
- On desktop (≥ 768px): sidebar is always visible, no hamburger

### Header
- On mobile: show org name + hamburger button only
- Hide "View Website" button on screens < 640px or move it to sidebar

### Animals Tab
- Grid view: 1 column on mobile, 2 on tablet, 3+ on desktop
- List view: hide less important columns on mobile (breed, gender). Keep name, status, edit/delete
- Animal modal: full-screen on mobile, centered modal on desktop. All fields stack vertically

### Dashboard Overview
- Stat cards: 2×2 grid on mobile, 4 across on desktop
- Recent animals: 2 columns on mobile, 3 on tablet

### General Rules
- All modals must be scrollable on mobile — no fixed-height modals that cut off content
- All form inputs must be at least 44px tall (touch targets)
- No horizontal scrolling on any page at 375px

---

## Part 3: Performance Optimization

### Dashboard (apps/dashboard/)
- Lazy load all tab components with React.lazy + Suspense (show a spinner fallback)
- Only load the active tab's data — don't prefetch all tabs on mount
- Memoize animal list filtering with useMemo so search/filter doesn't re-render unnecessarily

### Tenant Site (apps/tenant-site/)
- Add `loading="lazy"` to all `<img>` tags that are below the fold
- Add `<link rel="preconnect" href="https://xz6u-fpaz-praf.n7e.xano.io">` to the document head
- Use Astro's built-in `<Image>` component for any images that go through the build pipeline
- Ensure no unused JS is shipped — check that client-side scripts are only loaded where needed

### Verification
- `npm run build` passes in both apps with zero errors
- Dashboard sidebar collapses on mobile
- No Paragon/Mailchimp code remains