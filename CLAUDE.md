# CLAUDE.md — Barkhaus Project Memory
# This file is permanent project context for Claude Code.
# Read this ENTIRE file before planning or executing ANY task.
# When in doubt about architecture, data structure, or what's broken — re-read this file.

---

## WHAT IS BARKHAUS

Barkhaus is a multi-tenant SaaS platform for animal rescue organizations. Each rescue gets their own subdomain (e.g. `mbpr.barkhaus.io`), admin dashboard, and public-facing website — all managed from a single monorepo.

**Owner:** Kristin Schue
**First tenant:** Mission Bay Puppy Rescue (MBPR), org_id = 9, subdomain = `mbpr`
**Business model:** Monthly/annual SaaS subscription, 14-day free trial, payment via Stripe

---

## MONOREPO STRUCTURE

```
/ (root)
├── apps/
│   ├── marketing/          → barkhaus.io (Astro + Tailwind)
│   ├── dashboard/          → app.barkhaus.io (React + Vite)
│   └── tenant-site/        → *.barkhaus.io / *.preview.barkhaus.io (Astro SSR)
├── packages/               → shared utilities (if any)
├── _archived/
│   ├── barkhaus-admin.html → Original working HTML dashboard — REFERENCE THIS
│   │                         when rebuilding or fixing any dashboard tab.
│   │                         Contains all original UI patterns, section structures,
│   │                         and working API integration logic.
│   └── .xano-backup/
│       └── tables/         → Original Xano table schemas and data exports.
│                             Reference when reconstructing data models,
│                             understanding original field names/types,
│                             or debugging data migration issues.
├── CLAUDE.md               → THIS FILE
└── vercel.json             → root Vercel config (if present)
```

---

## THREE APPS — ROLES & TECH STACK

### 1. Marketing Site — `apps/marketing`
- **URL:** barkhaus.io
- **Framework:** Astro + Tailwind CSS v3
- **Purpose:** Public marketing, pricing, sign up, sign in, blog, new pages
- **Styling:** Tailwind only — NO global.css. Colors defined in `tailwind.config.mjs`
- **Key color classes:** `text-deep-taupe` (#4d4c4c), `text-stone` (#bfae9b)
- **Layout:** `src/layouts/BaseLayout.astro` — body base classes live here
- **Auth:** Supabase Auth (email/password + Google OAuth) + Stripe for payments
- **DO NOT** use `styles/global.css` for color changes — use Tailwind classes
- **Content source:** Relume.ai sitemap/content is the design reference for all pages
  - If a Relume export URL or file is provided, read it before building any page

### 2. Admin Dashboard — `apps/dashboard`
- **URL:** app.barkhaus.io
- **Framework:** React 18 + Vite + TypeScript
- **Purpose:** Rescue org management — animals, applications, website content, settings, social media, policies, forms
- **Styling:** Tailwind CSS v3
- **Auth:** Simple org-based login (org_id + password) stored in Supabase
- **Current org:** MBPR, org_id = 9, password = `rangers789`
- **API calls:** All in `src/lib/api.ts` using Supabase client
- **Supabase client:** `src/lib/supabase.ts` — uses `VITE_` env vars
- **REFERENCE:** `_archived/barkhaus-admin.html` — original working dashboard. Check this first when fixing or rebuilding any tab.
- **CRITICAL:** Dashboard cannot serve its own `/api/` routes — all API endpoints live on the tenant site. Always use full URLs: `https://mbpr.preview.barkhaus.io/api/[endpoint]`

### 3. Tenant Site — `apps/tenant-site`
- **URL:** `[subdomain].barkhaus.io` and `[subdomain].preview.barkhaus.io`
- **Framework:** Astro SSR (`output: 'server'` — must always be server, never static)
- **Purpose:** Public rescue website (animals, adoption, about, contact, donate, events, forms)
- **Multi-tenant routing:** `src/middleware.ts` reads subdomain → looks up org in Supabase → sets org_id
- **API routes:** `src/pages/api/` — called by dashboard cross-origin
- **Supabase client:** `src/lib/supabase.ts` — uses `PUBLIC_` env vars
- **CORS:** All `/api/` routes must include CORS headers for `https://app.barkhaus.io`
- **vercel.json** in this app sets CORS headers at CDN level for all `/api/*` routes

---

## DATABASE — SUPABASE

- **Project:** Barkhaus Xano (legacy name — ignore it)
- **URL:** `https://vycwqnsjhwviryfrdwfr.supabase.co`
- **RLS:** DISABLED on all tables (intentional — re-enable later with proper policies)
- **MBPR org_id = 9** — hardcoded in many places, this is correct
- **Original schemas:** See `_archived/.xano-backup/tables/` for original Xano field names and types

### Key Tables
| Table | Purpose |
|---|---|
| organizations | One row per rescue org. Branding, social URLs, domain, colors, fonts, logo |
| animals | All animals. `org_id` scopes to rescue. `photo_url` = Supabase Storage URL |
| applications | Adoption/foster application submissions |
| website_content | CMS content. Unique on `org_id + page_slug + section_key` |
| policies | AI-generated legal policies per org |
| forms | Custom form definitions as JSON |
| design_settings | Per-org branding overrides |
| users | Dashboard login users |

### Organizations Table — Key Columns
```
id, org, slug, subdomain, is_active,
primary_color, secondary_color, accent_color,
heading_font, body_font, font_scale,
logo_light_url, logo_dark_url, favicon_url,
facebook_url, instagram_url, twitter_url, youtube_url, tiktok_url,
custom_domain, contact_email, phone, address,
social_icon_style (light | dark | brand)
```

### Animals Table — Key Columns
```
id, org_id, name, litter_name, species, breed, description,
status, gender, size, intake_date,
spayed_neutered, microchip, vaccinated, special_needs,
internal_notes, photo_url
```

### Storage
- Bucket: `animal-images` (public)
- Path pattern: `org-{orgId}/{section}-{timestamp}.{ext}`

### CSV / Cognito Forms Import Pattern
When importing animals from a Cognito Forms CSV export:
1. Parse CSV (use papaparse or Python csv module)
2. Map Cognito field names → animals table column names
3. For image columns: Cognito exports URLs not files. Fetch each URL, re-upload to Supabase Storage `animal-images` bucket, save new Supabase public URL as `photo_url`
4. Upsert to animals table using `name + org_id` as conflict key to avoid duplicates
5. NOTE: Cognito image URLs may expire — run import as soon as possible after export

---

## ENVIRONMENT VARIABLES

### apps/dashboard (.env + Vercel)
```
VITE_SUPABASE_URL=https://vycwqnsjhwviryfrdwfr.supabase.co
VITE_SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service role key]
```

### apps/tenant-site (.env + Vercel)
```
PUBLIC_SUPABASE_URL=https://vycwqnsjhwviryfrdwfr.supabase.co
PUBLIC_SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service role key]
OPENAI_API_KEY=[already set — do not overwrite]
```

### apps/marketing (.env + Vercel)
```
PUBLIC_SUPABASE_URL=https://vycwqnsjhwviryfrdwfr.supabase.co
PUBLIC_SUPABASE_ANON_KEY=[anon key]
PUBLIC_STRIPE_PUBLISHABLE_KEY=[not yet set]
STRIPE_SECRET_KEY=[not yet set]
```

---

## CORS RULES — CRITICAL

The dashboard (`app.barkhaus.io`) calls tenant site API endpoints cross-origin.
Every API route in `apps/tenant-site/src/pages/api/` MUST:

1. Export an `OPTIONS` handler returning 204 with CORS headers
2. Include CORS headers on EVERY response — success AND error, no exceptions
3. Be covered by `apps/tenant-site/vercel.json`

```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.barkhaus.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
export const OPTIONS: APIRoute = async () =>
  new Response(null, { status: 204, headers: corsHeaders })
```

`apps/tenant-site/vercel.json` must always contain:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://app.barkhaus.io" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

---

## KNOWN WORKING ✅

- Supabase schema — all 20 tables, RLS disabled
- MBPR org record — id=9, slug=mbpr, subdomain=mbpr
- 49 MBPR animals in Supabase
- Animal photo upload → Supabase Storage → saves photo_url ✅ fixed 2026-03-12
- Dashboard: sidebar, animals tab, policies tab UI, social media tab UI, website content tab UI
- Google OAuth flow works (redirect URL needs Supabase config fix)

---

## KNOWN NOT WORKING ❌

### Admin Dashboard

**Settings (high priority):**
- Colors, logo, social URLs, fonts not persisting — `SettingsTab.tsx` uses hardcoded defaults on mount instead of loading from Supabase
- Fix: `useEffect` on mount must query `organizations` where `id = 9`, set all state from result
- Also needed: font family, font color, font size, heading style controls

**AI Generation (high priority):**
- Social media: returns "not available" — wrong URL (relative instead of full) + CORS issue
- Policies: same issue
- Both must call: `https://mbpr.preview.barkhaus.io/api/admin/[endpoint]`
- Both endpoints need CORS headers and `import.meta.env.OPENAI_API_KEY`

**Other dashboard:**
- View Website button may still link to missionbaypuppyrescue.org — must be `https://${org.subdomain}.preview.barkhaus.io`
- Website Content: empty for most pages, missing sections, no image upload per section
  - Reference `_archived/barkhaus-admin.html` for original section structure

### Tenant Site

- `/our-animals` animals display needs verification
- Animal detail: only first photo shows — needs multi-photo gallery
- Fonts/buttons on `/our-animals` too large — needs size reduction
- Adoption form still calls Xano (deferred)
- All other forms need building (foster, volunteer, contact, donate)
- Website content not pulling from Supabase — uses static content

### Marketing Site

- Logo too small in navbar
- Google OAuth redirects to localhost — fix `redirectTo` + Supabase URL config
- Email/password login not implemented
- Forgot password not implemented
- Full sign up flow not complete (plan selection → Stripe → org created → redirect)
- Stripe not integrated
- `text-stone` should be `text-deep-taupe` on most secondary text
- Title case on headings not done

**Pages not yet created:**
- `/my-dog-cinco` — Pay It Forward page
- `/partners` — Corporate partners + affiliate program
- `/blog` — Blog index + single post + 3 sample posts (Astro content collections)
- `/careers` — Open roles
- `/signup` — Full sign up with Stripe
- `/login` — Email + Google
- `/forgot-password`, `/reset-password`, `/auth/callback`

**Pricing page:**
- Cost comparison table (fragmented tools vs Barkhaus)
- Monthly/Annual toggle (20% discount annual)
- "Free for 14 days" on all plans
- "Join Waitlist" → "Start Free Trial"

**Homepage:**
- Features section: hover expand animation, scroll behavior
- "Learn More" links → buttons

### Integrations (not yet built)
- Social media posting: Meta Graph API, TikTok API
- Email providers: SendGrid, Mailchimp, SMTP
- DNS providers: GoDaddy, Namecheap, Cloudflare, Google Domains
- Stripe: subscription webhooks + management
- Forms system: drag-drop builder in dashboard, render on tenant site, submissions → Applications tab
- RLS: re-enable with proper policies when app is stable

---

## BUILD COMMANDS

```bash
# From monorepo root:
npm run build
npm run build --workspace=apps/dashboard
npm run build --workspace=apps/tenant-site
npm run build --workspace=apps/marketing

# Dev:
npm run dev --workspace=apps/dashboard     # localhost:3000
npm run dev --workspace=apps/tenant-site   # localhost:4321
npm run dev --workspace=apps/marketing     # localhost:4322
```

Always run `npm run build` after changes. Fix ALL errors before stopping.

---

## CODING STANDARDS

- TypeScript strict in dashboard + tenant-site API routes
- Astro = `.astro`, React = `.tsx`
- All Supabase queries include `.eq('org_id', orgId)` for data isolation
- Never hardcode org_id except where noted (dashboard → 9 is acceptable for MVP)
- API routes return structured `{ error: string }` JSON on failure
- `import.meta.env` in Astro, `process.env` in Node scripts, `VITE_` prefix in React/Vite
- Never commit `.env` files
- Always show visible success/error feedback after saves (toast or inline)
- Add descriptive `console.log` labels on all API calls and Supabase operations

---

## DEPLOYMENT

- All apps on Vercel
- Tenant site: wildcard `*.barkhaus.io`
- Preview: `[subdomain].preview.barkhaus.io`
- After any tenant-site change: confirm Vercel redeploys before testing CORS or API fixes

---


---

## MBPR FORMS — FIELD REFERENCE

These are the exact forms MBPR uses via Cognito Forms. The dashboard form builder must replicate these. Each field has a visibility setting: `public` (shown on tenant site) or `internal` (dashboard only).

### ADOPTION APPLICATION (tenant + internal versions)

**Section: Application Form** (public)
- How soon will you be ready to adopt? (text)
- Are you interested in? (dropdown: Adoption/Foster)
- Which Puppy Are You Most Interested In? (dropdown — pulls from animals)
- Below (text note)

**Section: About You** (public)
- First Name, Last Name (required)
- Cell Phone (required)
- Email (required)
- Address — no PO BOX (address fields: line1, line2, city, state, zip) (required)
- Age (required)
- Marital Status (dropdown)
- Personal Activity Level (dropdown)
- How Did You Hear About MBPR? (dropdown)

**Section: Work** (public)
- Occupation / describe what you do (required)
- Work Schedule (dropdown)
- Work/weekend hours away from home (textarea, required)

**Section: Family/Roommates** (public, repeating)
- # of people in house (required)
- Who lives with you? (repeating group: Name, Age, Relationship, Cell Phone, Schedule, Hours away, Pet experience, Agreement to get dog Yes/No)
- Add Person button

**Section: About Your Home** (public)
- Own/Rent (dropdown, required)
- Housing Type (dropdown, required)
- Dog door? (Yes/No)
- When left home alone (dropdown)
- Other pets? (Yes/No)

**Section: The Dog** (public)
- Preferred Age, Adult Size, Desired Size (dropdowns)
- Allergies restricting breed? (Yes/No)
- Would you consider fostering? (Yes/No)
- Interest in fostering (link to foster form)
- Brief description of family/lifestyle (textarea, required)

**Section: Social Media Approval** (public)
- Permission to post on social media? (Yes/No)

**Section: Contract Agreement** (public)
- Financial Commitment (checkbox)
- Vaccinations/Shelter (checkbox)
- Caring for my dog (checkbox)
- Caring for my dog MBPR (checkbox)
- Kennel training (checkbox)
- Hold Harmless: Current Pets (checkbox)
- Hold Harmless: Any Claims (checkbox)
- Health (checkbox)
- Spay/Neuter (checkbox)
- Maladjustment (checkbox)
- Return Policy (checkbox)
- Hold Harmless During Travel (checkbox)
- Signature + Date (required)

**Internal-only fields (dashboard only):**
- Code (dropdown: status codes)
- Puppy Placement: adopter name lookup, adoption fee, payment method, adoption date, private notes
- Alteration Status: Is Dog Fixed?, reason for delay
- Spay/Neuter Voucher: deposit waived/received, amount, payment method, returned
- Adoption Contract: all checkbox fields with staff verification

---

### FOSTER APPLICATION (tenant + internal versions)

**Section: About You** (public)
- Name, Cell Phone, Address (no PO BOX), Email, Age, Marital Status

**Section: Work** (public)
- Occupation, Manner of Employment (checkboxes: Full Time, Part Time, Work From Home, Part Time WFH, Stay at Home, Active Military, Unemployed, Student, Retired)
- Hours away from home per day

**Section: Family/Roommates** (public, repeating — same as adoption)

**Section: About Your Home** (public)
- Own/Rent, Housing Type, Dog door?, Other pets?

**Section: Availability** (public)
- Full Time Foster / Part Time Foster (radio)
- Breed allergies? (Yes/No)
- I consider myself (dropdown: experience level)
- MBPR will provide basic supplies note

**Section: Contract Agreement** (public — foster-specific terms)
- Signature + Date

**Internal-only fields:**
- Code, Internal notes, foster assignment tracking

---

### RELINQUISHMENT FORM (internal + public hybrid)

**Section: Internal** (dashboard only)
- Code (dropdown)
- Internal notes (textarea)

**Section: Policy/Agreement** (public — displayed before form)
- MBPR acceptance criteria (pregnant mothers, nursing with litters, orphaned litters, puppies under 12 months)
- Dogs over 12 months redirect text + links
- Spay/Neuter donation requirement ($200/dog, $300 for mother with litter)
- Found or Lost Dogs guidance
- Have you read and agreed? (dropdown, required)

**Section: Relinquishing Party** (public)
- Who is relinquishing? (dropdown)
- Rescue or Shelter Name
- Contact Name, Phone, Email
- Dog Name, Phone

---

### FORM BUILDER REQUIREMENTS (for dashboard)

The form builder must support:
- Field types: text, email, phone, textarea, dropdown/select, checkbox, radio, date, address (multi-field), repeating sections (add/remove rows), signature, file upload
- Field visibility: `public` (shows on tenant site) or `internal` (dashboard only)
- Required field toggle per field
- Section grouping with section titles
- Conditional logic: show/hide field based on another field's value (e.g. show foster details if "interested in fostering = Yes")
- Repeating sections (e.g. Family Members — add person)
- Contract/agreement checkboxes with long-form text
- Signature field
- Form submission → Applications tab in dashboard
- Each form gets a shareable URL: `https://[subdomain].barkhaus.io/forms/[form-slug]`
- Forms stored as JSON in Supabase `forms` table
- Submissions stored in `applications` table with `form_type` and `form_data` (JSONB)

---

## RELUME SITEMAP — BARKHAUS MARKETING PAGES

This is the full page/section structure from the Relume sitemap (Barkhaus-Platform.csv).
When building or adding to marketing site pages, ADD to existing content — do not replace what has already been built.

### Pages and their sections:
- **Home:** Navbar, Hero, Benefits, Feature (x3), Features List, Benefits, CTA, Testimonial, CTA, Newsletter, CTA/Contact, Footer
- **About Us:** Navbar, Header, About (x3), How It Works, Team, Awards, Partner Logos, Testimonial, CTA, Contact, Footer
- **Features:** Navbar, Header, Features List, CTA, Benefits, Feature-Animal Mgmt, Feature (x6), Feature-Volunteers, How It Works, CTA, Testimonial, CTA, Contact, Footer
- **Dashboard:** Navbar, Header, CTA, Features List, Feature (x3), Stats, Testimonial, CTA, Contact, Footer
- **Pricing:** Navbar, Header, Pricing Section, Pricing Comparison, Feature, Testimonial, CTA, FAQ, Footer
- **Blog:** Navbar, Featured Blog Header, Blog List (x2), CTA, Newsletter, Contact, Footer
- **Blog Post:** Navbar, Post Header, Post Body, Testimonial, CTA, Newsletter, Contact, Blog List, Footer
- **Case Studies:** Navbar, Header, Featured Case Study, Case Study List, Testimonial, CTA, Footer
- **Resources:** Navbar, Header, Resources List, Featured Resources, Testimonial, CTA, Newsletter, Contact, Footer
- **Events:** Navbar, Header, Events List, Event Schedule, CTA, Contact, Footer
- **FAQ:** Navbar, Header, FAQ Section, Contact, Footer
- **Contact Us:** Navbar, Header, Contact, Contact Form, Locations, CTA Form, Award Logos, Footer
- **Sign In:** Navbar, Header, CTA Form, CTA (x3), Footer
- **Sign Up:** Navbar, Header, CTA Form, Features List, FAQ, CTA, Newsletter, Contact, Footer
- **Overview:** Navbar, Header, Feature (x3), Features List, How It Works, Stats, Testimonial, CTA, Contact, Footer
- **Shelter Management:** Navbar, Header, Feature (x3), Features List, Benefits, Testimonial, CTA, FAQ, Contact, Footer
- **Marketing Tools:** Navbar, Header, Feature (x3), Features List, Benefits, Stats, Testimonial, CTA, Newsletter, Contact, Footer
- **Adoption Tracking:** Navbar, Header, Feature (x3), Features List, Testimonial, How It Works, Benefits, FAQ, CTA, Contact, Footer
- **Reports:** Navbar, Header, Feature (x2), Features List, Testimonial, CTA, Footer
- **Testimonials:** Navbar, Header, Testimonial (x4), Features List, CTA, CTA Form, Footer
- **MyDogCinco / Partners / Careers** — custom pages, not in Relume sitemap

---

## COGNITO FORMS API — ANIMAL IMPORT WITH PHOTOS

API Key is stored in environment — do not hardcode.
Add to `apps/tenant-site/.env` as: `COGNITO_FORMS_API_KEY=[key]`

Base URL: `https://www.cognitoforms.com/api/`
Organization ID: `5bdc1d75-ba00-42ba-ac54-98e75acfcef2`
Form name: Paws 2026 (the animal tracking form)

### Import script pattern:
```ts
// 1. Fetch all entries
const entries = await fetch(
  'https://www.cognitoforms.com/api/forms/Paws20262/entries',
  { headers: { Authorization: `Bearer ${COGNITO_FORMS_API_KEY}` } }
)

// 2. For each entry, map fields to animals table columns
// 3. For image fields: fetch the image URL from Cognito, re-upload to Supabase Storage
// 4. Upsert to animals table using DogName + org_id = 9 as conflict key
```

### Field mapping (Cognito → Supabase animals):
| Cognito Field | Supabase Column |
|---|---|
| DogName | name |
| LitterName | litter_name |
| Gender | gender |
| EstimatedSizeWhenGrown | size |
| Breed | breed |
| MyStory | description |
| Code (status mapping) | status |
| IntakeDate | intake_date |
| MicrochipNumber | microchip (boolean: has chip) |
| AlterationStatus_IsDogFixed | spayed_neutered |
| Vaccinations_Bordatella | vaccinated |
| AlterationStatus_ReasonForDelay | special_needs |
| PuppyPlacement2_PrivateNotes | internal_notes |
| [image field if found via API] | photo_url |

### Status mapping:
- "Deceased" → "Adopted"
- "Available: Now" → "Available"
- "Adopted" → "Adopted"
- "Pending" → "Pending"
- anything else → "Available"

---

## PRIORITIZED TASK QUEUE

Complete in order. Verify each before moving on.

**PRIORITY 1 — Dashboard stability**
1. Settings persistence — load from Supabase on mount, save with confirmation
2. Social media AI — CORS + full URL + OpenAI key
3. Policy AI — same
4. View Website button — dynamic subdomain URL
5. Website Content — scrape live site to seed, add image upload per section, add all missing sections (ref _archived/barkhaus-admin.html)
6. Font/color/size controls in Settings

**PRIORITY 2 — Tenant site**
7. Verify animals + photos on /our-animals
8. Fix font/button sizing on /our-animals
9. Multi-photo gallery on animal detail
10. Wire website_content table to tenant site pages

**PRIORITY 3 — CSV import**
11. Build CSV import: Cognito CSV → fetch images → Supabase Storage → upsert animals

**PRIORITY 4 — Marketing site**
12. Fix logo size
13. Fix auth redirect
14. Email/password login + forgot password
15. Full sign up + Stripe 14-day trial
16. Fix text-stone → text-deep-taupe
17. New pages: MyDogCinco, Partners, Blog, Careers
18. Pricing: comparison table + toggle
19. Homepage: features animation

**PRIORITY 5 — Forms system**
20. Form builder in dashboard
21. Forms on tenant site
22. Submissions → Applications tab

**PRIORITY 6 — Integrations**
23. Stripe subscription management
24. Social media posting APIs
25. Email provider connections
26. DNS setup guides
27. Re-enable RLS