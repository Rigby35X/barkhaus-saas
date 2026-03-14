import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vycwqnsjhwviryfrdwfr.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_2jZhe67l7iFgctYpSfCHeg_7lCyAIV3';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ORG_ID = 9;

// All rows to upsert into website_content
const rows = [
  // ─── HOMEPAGE ────────────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'hero',
    headline: 'Every Dog Deserves a Loving Home!!',
    subheadline: 'At Mission Bay Puppy Rescue, we\'re dedicated to finding loving homes for dogs in need.',
    body_text: 'Browse our available dogs, submit an application, or learn how you can help support our mission.',
    button_text: 'Meet Our Dogs',
    button_link: '/our-animals',
  },
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'about_us',
    headline: 'About Mission Bay Puppy Rescue',
    body_text: 'Founded in 2020, Mission Bay Puppy Rescue has been dedicated to saving and rehoming dogs throughout San Diego. We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area. Every animal deserves a loving home and a second chance at life.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'homepage',
    section_key: 'what_we_do',
    headline: 'What We Do',
    subheadline: 'Rescue. Rehabilitate. Rehome.',
    body_text: 'We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area. Every animal deserves a loving home and a second chance at life.',
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
    faq_answer_4: 'Yes, if for any reason the adoption doesn\'t work out, we welcome the dog back with open arms.',
    faq_question_5: 'What if I have other pets?',
    faq_answer_5: 'We can arrange supervised introductions to ensure all pets get along before finalizing the adoption.',
  },

  // ─── ABOUT ───────────────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'about',
    section_key: 'hero',
    headline: 'About Mission Bay Puppy Rescue',
    body_text: 'Learn about our mission, values, and the dedicated team working to save dogs in need.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'about',
    section_key: 'our_story',
    headline: 'Our Mission',
    body_text: 'Every dog deserves a loving home. We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area. Founded in 2020, Mission Bay Puppy Rescue has been dedicated to saving and rehoming dogs throughout San Diego.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'about',
    section_key: 'what_we_do_expanded',
    headline: 'Why We Exist',
    body_text: 'Every dog deserves a loving home. We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area. We are committed to being a resource for the community and a safe haven for animals in need.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'about',
    section_key: 'team',
    headline: 'Our Team',
    body_text: 'Our dedicated volunteers and staff work tirelessly every day to care for animals, process adoptions, and support our community. We are a volunteer-driven organization powered by compassion.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'about',
    section_key: 'faq_section',
    headline: 'Frequently Asked Questions',
    faq_question_1: 'How long does the adoption process take?',
    faq_answer_1: 'Our adoption process typically takes 3–7 days from application to bringing your new companion home.',
    faq_question_2: 'What is included in the adoption fee?',
    faq_answer_2: 'All dogs come spayed/neutered, vaccinated, microchipped, and with a health certificate.',
    faq_question_3: 'Can I meet the dog before adopting?',
    faq_answer_3: 'Absolutely! We encourage meet-and-greets to ensure a perfect match for both you and the dog.',
    faq_question_4: 'Do you have a return policy?',
    faq_answer_4: 'Yes, if for any reason the adoption doesn\'t work out, we welcome the dog back with open arms.',
    faq_question_5: 'What if I have other pets?',
    faq_answer_5: 'We can arrange supervised introductions to ensure all pets get along before finalizing the adoption.',
  },

  // ─── CONTACT ─────────────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'contact',
    section_key: 'hero',
    headline: 'Get in Touch',
    body_text: 'Bring Happiness Home. Mission Bay Puppy Rescue is a 501(c)(3) non-profit organization dedicated to finding loving homes for abandoned and homeless puppies in San Diego and beyond.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'contact',
    section_key: 'contact_info',
    headline: 'Contact Us',
    subheadline: 'We\'d love to hear from you',
    body_text: 'Email: admin@mbpr.org\nPhone: (619) 555-PUPS\nAddress: 456 Mission Bay Drive, Suite 200, San Diego, CA 92109',
  },

  // ─── ANIMALS ─────────────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'animals',
    section_key: 'hero',
    headline: 'Meet Our Available Dogs',
    body_text: 'Browse our current dogs available for adoption and find your perfect match.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'animals',
    section_key: 'adoption_process',
    headline: 'How to Adopt',
    body_text: 'Our adoption process typically takes 3–7 days from application to bringing your new companion home. All dogs come spayed/neutered, vaccinated, microchipped, and with a health certificate. We encourage meet-and-greets to ensure a perfect match for both you and the dog.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'animals',
    section_key: 'more_info',
    headline: 'Don\'t See Your Perfect Match?',
    body_text: 'We have more animals in foster care and new arrivals coming in regularly. Contact us to learn about animals not yet listed online, or to get on our waiting list for specific breeds or sizes.',
  },

  // ─── DONATE ──────────────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'donate',
    section_key: 'hero',
    headline: 'Support Our Mission',
    body_text: 'Your donation helps us rescue, care for, and rehome dogs in need. Every dollar makes a difference in the life of an animal waiting for their forever home.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'donate',
    section_key: 'impact',
    headline: 'Your Impact',
    body_text: '500+ animals rescued this year. 95% adoption success rate. 24/7 emergency care available. 75% of all donations go directly to animal care. $25 provides food for one animal for a week. $50 covers basic medical care and vaccinations. $100 sponsors spay/neuter surgery. $250 covers emergency medical treatment.',
  },

  // ─── EVENTS ──────────────────────────────────────────────────────────────────
  {
    org_id: ORG_ID,
    page_slug: 'events',
    section_key: 'hero',
    headline: 'Upcoming Events',
    body_text: 'Attend our adoption events, fundraisers, and community gatherings.',
  },
  {
    org_id: ORG_ID,
    page_slug: 'events',
    section_key: 'upcoming',
    headline: 'Don\'t Miss These Events',
    body_text: 'Join us for adoption events, volunteer orientations, fundraising galas, and community gatherings throughout the year. Subscribe to our newsletter to be the first to know about upcoming adoption events, fundraisers, and volunteer opportunities.',
  },

  // ─── GLOBAL / FOOTER ─────────────────────────────────────────────────────────
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
  },
];

async function seed() {
  console.log(`Seeding ${rows.length} rows into website_content for org_id=${ORG_ID}...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const label = `${row.page_slug} / ${row.section_key}`;
    const { error } = await supabase
      .from('website_content')
      .upsert(row, { onConflict: 'org_id,page_slug,section_key' });

    if (error) {
      console.error(`  FAIL  [${label}]:`, error.message);
      errorCount++;
    } else {
      console.log(`  OK    [${label}]`);
      successCount++;
    }
  }

  console.log(`\nDone. ${successCount} upserted successfully, ${errorCount} errors.`);
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
