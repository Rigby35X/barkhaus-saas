# Barkhaus Phase 3.6 — Admin Onboarding Walkthrough

## Overview

This brief is for autonomous Claude Code execution. Build a guided onboarding tour inside the React admin dashboard. The tour launches automatically on first login and can be restarted via a "Tour Guide" button in the sidebar.

**Do not install any third-party tour libraries** (no Shepherd.js, no React Joyride). Build it from scratch as a React component.

---

## Behavior

- On first login, automatically show the tour (check localStorage for `barkhausOnboardingComplete`)
- If `barkhausOnboardingComplete` is set to `"true"`, skip the auto-start
- A "Tour Guide" button in the sidebar footer lets the user restart the tour at any time
- Restarting clears `barkhausOnboardingComplete` and relaunches from step 1

---

## localStorage Keys

```ts
'barkhausOnboardingComplete' // "true" when tour has been finished or skipped
```

Helper functions to export from `lib/onboarding.ts`:
```ts
isOnboardingComplete(): boolean
markOnboardingComplete(): void
resetOnboarding(): void
```

---

## Tour Structure — 11 Steps

| Step | Tab | Target Element | Title | Body |
|------|-----|----------------|-------|------|
| 1 | overview | stat cards | Welcome to Barkhaus! | This is your dashboard overview. These cards show your animal counts at a glance. |
| 2 | overview | recent animals | Recent Animals | Your most recently added animals appear here. |
| 3 | overview | quick actions | Quick Actions | Use these buttons to jump to common tasks. |
| 4 | animals | animals tab nav | Animals | Manage all your animals here — add, edit, or remove listings. |
| 5 | animals | add animal button | Add Animals | Click here to add a new animal to your rescue. |
| 6 | applications | applications tab nav | Applications | View and manage adoption, foster, and relinquishment applications. |
| 7 | website-content | website-content tab nav | Website Content | Edit your public website content directly from here — no coding needed. |
| 8 | communications | communications tab nav | Communications | View form submissions from your website visitors. |
| 9 | social-media | social-media tab nav | Social Media | Generate AI-powered social media posts for your animals. |
| 10 | settings | settings tab nav | Settings | Configure your organization info, branding, and more. |
| 11 | overview | sidebar footer | You're all set! | You've completed the tour. You can restart it anytime using the Tour Guide button. |

---

## Visual Design

### Overlay
- Full-screen dark overlay: `rgba(0, 0, 0, 0.55)`
- A "spotlight" cutout shows through the overlay to highlight the target element
- The cutout has rounded corners (12px) and a 8px padding around the target
- The overlay is rendered via a single `<div>` with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)` clipped to the target rect — no canvas needed

### Tooltip Card
- White card, `rounded-2xl`, `shadow-xl`, `p-6`, max-width 320px
- Positioned adjacent to the spotlight (right, left, top, or bottom — whichever fits)
- Never overflows the viewport — flip position if needed
- Contains:
  - Step counter: "Step X of 11" in small gray text
  - Progress bar: thin bar showing X/11 filled in warm-brown
  - Title: `font-serif font-bold text-deep-taupe`
  - Body text: `text-sm text-stone`
  - Button row: Back (secondary), Next/Finish (primary warm-brown), Skip (text link)

### Tab Navigation
- When a step targets a different tab than the current one, call `onNavigateTab(tabKey)` first
- Wait 350ms for the tab to render before positioning the spotlight
- Use `requestAnimationFrame` after the delay to measure the target element

---

## Component Files

### `apps/dashboard/src/lib/onboarding.ts`
```ts
export interface OnboardingStep {
  id: number;
  tab: TabKey;
  targetSelector: string;  // CSS selector for the spotlight target
  title: string;
  body: string;
  position: 'right' | 'left' | 'top' | 'bottom' | 'center';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [ /* 11 steps */ ];
export function isOnboardingComplete(): boolean;
export function markOnboardingComplete(): void;
export function resetOnboarding(): void;
```

### `apps/dashboard/src/components/Onboarding.tsx`
Props:
```ts
interface OnboardingProps {
  onComplete: () => void;
  onNavigateTab: (tab: TabKey) => void;
}
```

### `apps/dashboard/src/components/Sidebar.tsx`
- Add `onRestartTour?: () => void` prop
- Render a "Tour Guide" button at the bottom of the sidebar nav (below all nav items, above logout)
- Style: small, subtle — `text-xs text-stone hover:text-warm-brown` with a `?` or compass icon

### `apps/dashboard/src/components/Layout.tsx`
- Accept and pass through `onRestartTour` prop to Sidebar

### `apps/dashboard/src/App.tsx`
- Add `showOnboarding` state (boolean)
- On login: if `!isOnboardingComplete()`, set `showOnboarding(true)`
- Add `handleRestartTour`: calls `resetOnboarding()`, sets `activeTab('overview')`, sets `showOnboarding(true)`
- Pass `onRestartTour={handleRestartTour}` to Layout
- Render `<Onboarding>` conditionally when `showOnboarding` is true

---

## Verification Checklist

| Check | How to Verify |
|-------|---------------|
| Tour auto-starts on first login | Clear localStorage, login — tour begins |
| Tour does not auto-start on return | Login again without clearing — no tour |
| All 11 steps render | Click through every step |
| Tab navigation works | Steps that switch tabs navigate correctly with 350ms delay |
| Spotlight highlights correct element | Each step highlights the right UI element |
| Skip button works | Tour ends, localStorage key is set |
| Tour Guide button restarts tour | Click button in sidebar — tour restarts from step 1 |
| Mobile works | At 375px tooltip shows at bottom, spotlight still works |
| Build passes | `cd apps/dashboard && npm run build` — zero errors |

---

## What NOT to Do

- Do not install Shepherd.js, React Joyride, or any third-party tour library
- Do not modify any API calls or backend behavior
- Do not change the dashboard's existing functionality
- Do not add new tabs or features
- Do not touch `_archived/`