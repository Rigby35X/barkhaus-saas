# Barkhaus Phase 5 — Marketing Site Rebuild (Astro SSG)

## Overview

This brief is for autonomous Claude Code execution. Rebuild the Barkhaus marketing site (`apps/marketing/`) from plain HTML/CSS into a modern Astro SSG site. The new site lives at `barkhaus.io`.

**The site must be fully static (SSG, zero client JS unless required).** Every page must work at 375px mobile width.

---

## Tech Stack

- Astro (SSG mode — `output: 'static'`)
- Tailwind CSS v3
- TypeScript
- Deployed to Vercel (project: barkhaus-marketing)

---

## Design System

Use the same warm/neutral palette as the dashboard:

```
Primary: #804e3f (warm-brown)
Secondary: #d8c8b6 (silver-gray)
Accent: #bfae9b (stone)
Text: #4d4c4c (deep-taupe)
Background: #e9e8e6 (cloud)
Light: #e2d4c6 (dove)
```

**Fonts (Google Fonts — load in BaseLayout):**
- Headings: `Noto Serif Display`, weight 600
- Body: `Poppins`, weight 400/500

---

## File Structure

```
apps/marketing/
├── src/
│   ├── components/
│   │   ├── BaseLayout.astro       # <head>, fonts, meta, footer
│   │   ├── Navbar.astro           # Scroll-aware transparent→solid
│   │   ├── Footer.astro           # 4-column footer
│   │   ├── Hero.astro             # Reusable hero section
│   │   ├── FeatureCard.astro      # Icon + title + description card
│   │   ├── PricingCard.astro      # Plan card with feature list
│   │   ├── TestimonialCard.astro  # Quote + author
│   │   ├── FAQItem.astro          # Collapsible <details> item
│   │   ├── CTABanner.astro        # Full-width CTA section
│   │   ├── LoginForm.tsx          # React island — email/password login
│   │   └── SignupForm.tsx         # React island — multi-step signup
│   └── pages/
│       ├── index.astro            # Homepage (8 sections)
│       ├── features.astro         # Features page
│       ├── pricing.astro          # Pricing + FAQ
│       ├── about.astro            # About page
│       ├── contact.astro          # Contact form
│       ├── login.astro            # Login page (uses LoginForm island)
│       ├── signup.astro           # Signup page (uses SignupForm island)
│       ├── forgot-password.astro  # Forgot password stub
│       └── signup/
│           ├── success.astro      # Post-signup success
│           └── cancelled.astro    # Stripe cancelled
├── astro.config.mjs
├── tailwind.config.mjs
└── vercel.json
```

---

## Pages

### Homepage (`index.astro`) — 8 sections

1. **Hero** — Headline: "The all-in-one platform for animal rescues." Subhead: "Manage animals, applications, and your website from one dashboard." CTA buttons: "Start Free" (→ /signup) and "See How It Works" (→ /features).

2. **Social Proof** — "Trusted by rescue organizations across the country." Show 3–5 placeholder org logos or names.

3. **Features Grid** — 6 feature cards:
   - Animal Management: Add, edit, and track every animal in your rescue
   - Application Inbox: Review adoption and foster applications in one place
   - Website Builder: Edit your public site content without touching code
   - Social Media AI: Generate posts for Facebook, Instagram, and more
   - Multi-Org Support: Manage multiple rescue locations from one account
   - CSV Import: Bulk import animals from spreadsheets in seconds

4. **How It Works** — 3 steps: (1) Create your account, (2) Set up your rescue profile, (3) Start managing animals

5. **Dashboard Showcase** — Large screenshot placeholder with caption "Everything in one place"

6. **Testimonials** — 3 testimonial cards with placeholder quotes from rescue coordinators

7. **Pricing Preview** — 3 pricing tiers (see Pricing page for details). Link to /pricing.

8. **CTA Banner** — "Ready to modernize your rescue?" with "Get Started Free" button

---

### Features Page (`features.astro`)

Hero + 6 alternating feature sections (image left/right alternating) with:
- Animal management deep dive
- Applications workflow
- Website content editor
- Social media generator
- Multi-tenancy
- CSV import + bulk tools

Bottom CTA banner → /signup

---

### Pricing Page (`pricing.astro`)

**3 pricing tiers:**

| | Starter | Professional | Enterprise |
|---|---|---|---|
| Price | Free | $29/mo | Contact us |
| Animals | Up to 25 | Unlimited | Unlimited |
| Users | 1 | 5 | Unlimited |
| Website | ✓ | ✓ | ✓ |
| Applications | ✓ | ✓ | ✓ |
| Social AI | — | ✓ | ✓ |
| Priority support | — | — | ✓ |
| CTA | Start Free | Start Trial | Contact Sales |

**FAQ accordion** (6 questions):
- Can I upgrade or downgrade at any time?
- Is there a free trial for Professional?
- What happens to my data if I cancel?
- Do you support multiple locations?
- Is my data secure?
- How does the website builder work?

---

### About Page (`about.astro`)

Hero + problem/solution sections + mission statement + placeholder team section

---

### Contact Page (`contact.astro`)

Hero + contact form (name, email, org name, message, submit button) + contact info sidebar (email, response time note)

Contact form is static — no backend wiring needed. Show a success message on submit using a simple JS event handler.

---

### Login Page (`login.astro`)

Uses `<LoginForm client:load />` React island.

LoginForm behavior:
- Email + password fields
- On submit: POST to `/api/auth/login` (Xano endpoint — wrap in try/catch)
- On success: store token in localStorage as `barkhausAuthToken`, redirect to `https://app.barkhaus.io?token={token}`
- On error: show inline error message
- Link to /forgot-password and /signup

---

### Signup Page (`signup.astro`)

Uses `<SignupForm client:load />` React island.

SignupForm — 3 steps:

**Step 1: Account Details**
- Organization name (required)
- Your name (required)
- Email (required)
- Password (required, min 8 chars)
- Confirm password (must match)
- Inline validation on all fields

**Step 2: Choose a Plan**
- 3 plan cards: Starter (Free), Professional ($29/mo), Enterprise (Contact Us)
- Selecting a plan highlights it

**Step 3: Processing / Redirect**
- Starter: POST to `/api/auth/signup` then redirect to `https://app.barkhaus.io?token={token}`
- Professional: POST to `/api/auth/signup` then POST to `/api/billing/create-checkout-session` then redirect to Stripe Checkout URL
- Enterprise: Show "Thanks! We'll be in touch." message
- All API calls wrapped in try/catch with visible error states

---

### Other Pages

- `forgot-password.astro` — Email input form, submit shows "Check your email" confirmation. No backend wiring needed yet.
- `signup/success.astro` — "You're in! Redirecting to your dashboard..." with a manual link
- `signup/cancelled.astro` — "No worries. You can upgrade anytime." with link back to /pricing

---

## Navbar

- Logo left, nav links center/right: Features, Pricing, About, Contact
- CTA buttons: Log In (outline), Get Started (filled warm-brown)
- On scroll: transitions from transparent to white with shadow (use a scroll event listener — the only JS on static pages)
- Mobile: hamburger menu, nav links in dropdown

---

## Footer (4 columns)

- Column 1: Logo + tagline + social icons
- Column 2: Product links (Features, Pricing, Dashboard)
- Column 3: Company links (About, Contact, Blog placeholder)
- Column 4: Legal (Privacy Policy, Terms of Service — stub pages not needed)
- Bottom bar: © 2024 Barkhaus. All rights reserved.

---

## Config Files

### `astro.config.mjs`
```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  integrations: [tailwind(), react()],
});
```

### `vercel.json`
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }
      ]
    }
  ]
}
```

---

## Verification Checklist

| Check | How to Verify |
|-------|---------------|
| Build passes | `cd apps/marketing && npm run build` — zero errors |
| Homepage renders | All 8 sections visible |
| Mobile nav works | At 375px hamburger shows, links accessible |
| Pricing tiers render | 3 cards with correct features |
| FAQ accordion works | Click to expand/collapse |
| Login form renders | Email + password fields visible |
| Signup form renders | 3-step flow visible |
| No horizontal scroll | At 375px no overflow |

---

## What NOT to Do

- Do not add a CMS or any database connections
- Do not add Auth0 — use the custom Xano auth flow described above
- Do not add analytics scripts yet
- Do not touch `_archived/`, `apps/dashboard/`, or `apps/tenant-site/`