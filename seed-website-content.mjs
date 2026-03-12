/**
 * Seed script — inserts scraped MBPR site content into website_content table
 * Run: node seed-website-content.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vycwqnsjhwviryfrdwfr.supabase.co'
const SERVICE_ROLE_KEY = 'sb_secret_2jZhe67l7iFgctYpSfCHeg_7lCyAIV3'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BASE = 'https://mbpr.preview.barkhaus.io'
const ORG_ID = 9
const NOW = new Date().toISOString()

const rows = [
  // ─── HOMEPAGE ────────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'hero',
    headline: 'Every Dog Deserves a Loving Home',
    body_text: "At Mission Bay Puppy Rescue, we're dedicated to finding loving homes for dogs in need.",
    button_text: 'Meet Our Dogs',
    button_link: '/our-animals',
    background_image_url: `${BASE}/assets/images/about-hero.jpg`,
    updated_at: NOW,
  },
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'services_header',
    headline: 'Our Services',
    service_1: 'Adopt',
    service_1_description: 'Find your perfect canine companion and give a rescue dog their forever home.',
    service_1_icon: '🐾',
    service_2: 'Foster',
    service_2_description: 'Provide a temporary loving home while a dog waits for their forever family.',
    service_2_icon: '🏡',
    service_3: 'Volunteer',
    service_3_description: 'Help our animals thrive by donating your time, skills, and compassion.',
    service_3_icon: '🤝',
    updated_at: NOW,
  },
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'about_us',
    headline: 'About Mission Bay Puppy Rescue',
    body_text: 'Founded in 2020, Mission Bay Puppy Rescue has been dedicated to saving and rehoming dogs throughout San Diego. We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area.',
    featured_image_url: `${BASE}/assets/images/about1.jpg`,
    secondary_image_url: `${BASE}/assets/images/about2.jpg`,
    updated_at: NOW,
  },
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'what_we_do',
    headline: 'What We Do',
    subheadline: 'Rescue. Rehabilitate. Rehome.',
    body_text: 'We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area. Every animal deserves a loving home and a second chance at life.',
    featured_image_url: `${BASE}/assets/images/about-hero.jpg`,
    updated_at: NOW,
  },
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'faq_section',
    headline: 'Frequently Asked Questions',
    faq_question_1: 'How long does the adoption process take?',
    faq_answer_1: 'Our adoption process typically takes 3–7 days from application to bringing your new companion home.',
    faq_question_2: 'What is included in the adoption fee?',
    faq_answer_2: 'All dogs come spayed/neutered, vaccinated, microchipped, and with a health certificate.',
    faq_question_3: 'Can I meet the dog before adopting?',
    faq_answer_3: 'Absolutely! We encourage meet-and-greets to ensure a perfect match for both you and the dog.',
    faq_question_4: 'Do you have a return policy?',
    faq_answer_4: "Yes, if for any reason the adoption doesn't work out, we welcome the dog back with open arms.",
    faq_question_5: 'What if I have other pets?',
    faq_answer_5: 'We can arrange supervised introductions to ensure all pets get along before finalizing the adoption.',
    updated_at: NOW,
  },

  // ─── ABOUT PAGE ──────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'about',
    section_key: 'about_main',
    headline: 'About Mission Bay Puppy Rescue',
    body_text: "Every dog deserves a loving home. We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area.\n\nFounded in 2020, Mission Bay Puppy Rescue has been dedicated to saving and rehoming dogs throughout San Diego. Whether you're looking to adopt, foster, or volunteer, there are many ways you can help save lives and make a difference in our community.",
    featured_image_url: `${BASE}/assets/images/about-hero.jpg`,
    updated_at: NOW,
  },

  // ─── CONTACT PAGE ────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'contact',
    section_key: 'contact_main',
    headline: 'Get in Touch',
    body_text: "Get in touch with us through any of the following methods. We'd love to hear from you.",
    updated_at: NOW,
  },

  // ─── ANIMALS PAGE ────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'animals',
    section_key: 'animals_header',
    headline: 'Meet Our Available Dogs',
    body_text: 'Browse our current dogs available for adoption and find your perfect match. We have more animals in foster care and new arrivals coming in regularly.',
    updated_at: NOW,
  },

  // ─── DONATE PAGE ─────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'donate',
    section_key: 'donate_header',
    headline: 'Support Our Mission',
    body_text: 'Your donation helps us rescue, care for, and rehome dogs in need. 75% of every dollar goes directly to animal care.',
    button_text: 'Donate Now',
    button_link: '/donate',
    updated_at: NOW,
  },

  // ─── EVENTS PAGE ─────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'events',
    section_key: 'events_header',
    headline: 'Upcoming Events',
    body_text: "Don't miss our adoption events, fundraisers, and volunteer opportunities. Subscribe to our newsletter to be the first to know.",
    updated_at: NOW,
  },

  // ─── APPLICATIONS PAGE ───────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'applications',
    section_key: 'applications_header',
    headline: 'Get Involved',
    body_text: "Ready to welcome a new family member? Our adoption process ensures the perfect match between you and your future pet. Adoption fees include spay/neuter, vaccinations, microchip, and health check.",
    updated_at: NOW,
  },

  // ─── GLOBAL / FOOTER ─────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'global',
    section_key: 'footer',
    footer_organization_name: 'Mission Bay Puppy Rescue',
    footer_address_line_one: '456 Mission Bay Drive',
    footer_address_line_two: 'Suite 200',
    footer_address_city: 'San Diego',
    footer_address_state: 'CA',
    footer_address_zip: '92109',
    footer_phone: '(619) 555-PUPS',
    footer_email: 'admin@mbpr.org',
    footer_ein: '87-2984609',
    footer_copyright: '© 2026 Mission Bay Puppy Rescue. All rights reserved.',
    updated_at: NOW,
  },
]

async function seed() {
  console.log(`\n🌱 Seeding ${rows.length} website_content rows for org_id ${ORG_ID}...\n`)

  const { data, error } = await supabase
    .from('website_content')
    .upsert(rows, { onConflict: 'org_id,page_slug,section_key' })
    .select('id, page_slug, section_key')

  if (error) {
    console.error('❌ Upsert error:', error.message)
    process.exit(1)
  }

  console.log(`✅ Upserted ${data?.length ?? rows.length} rows\n`)

  // ── Verify: count per page_slug ──────────────────────────────────────────
  const { data: allRows, error: countErr } = await supabase
    .from('website_content')
    .select('page_slug, section_key')
    .eq('org_id', ORG_ID)

  if (countErr) {
    console.error('Count query error:', countErr.message)
  } else {
    console.log('📊 Rows per page_slug:')
    const bySlug = {}
    for (const row of allRows) {
      bySlug[row.page_slug] = (bySlug[row.page_slug] ?? 0) + 1
    }
    for (const [slug, count] of Object.entries(bySlug)) {
      const sections = allRows.filter(r => r.page_slug === slug).map(r => r.section_key).join(', ')
      console.log(`  ${slug.padEnd(14)} ${count} row(s)  [${sections}]`)
    }
    console.log(`\n  Total: ${allRows.length} rows in website_content for org ${ORG_ID}\n`)
  }
}

seed().catch((e) => { console.error(e); process.exit(1) })
