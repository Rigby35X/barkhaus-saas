/**
 * Content Fetcher Utility
 * Fetches dynamic content from Supabase directly.
 */

// Default fallback content for different page types
const DEFAULT_CONTENT = {
  homepage: {
    hero: {
      headline: "Every Dog Deserves a Loving Home",
      subheadline: "Rescue • Love • Adopt",
      body_text: "At Mission Bay Puppy Rescue, we're dedicated to finding loving homes for dogs in need.",
      button_text: "Meet Our Dogs",
      button_link: "/our-animals/",
      background_image_url: "/assets/images/hero.jpg"
    },
    services_header: {
      headline: "Our Services",
      subheadline: "What We Do",
      body_text: "We provide comprehensive rescue services for dogs in need."
    },
    about_us: {
      headline: "About Mission Bay Puppy Rescue",
      subheadline: "About Us",
      body_text: "Founded in 2020, Mission Bay Puppy Rescue has been dedicated to saving and rehoming dogs throughout San Diego.",
      button_text: "More About Us",
      button_link: "/about",
      featured_image_url: "/assets/images/about-featured.jpg",
      secondary_image_url: "/assets/images/about-secondary.jpg"
    },
    what_we_do: {
      headline: "What We Do",
      subheadline: "Our Mission",
      body_text: "We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area.",
      featured_image_url: "/assets/images/what-we-do-1.jpg",
      secondary_image_url: "/assets/images/what-we-do-2.jpg"
    },
    success_stories: {
      headline: "Success Stories",
      subheadline: "Happy Endings",
      body_text: "See the amazing transformations and happy endings we've helped create."
    },
    reviews_header: {
      headline: "What People Say",
      subheadline: "Reviews",
      body_text: "Hear from families who have adopted through our rescue."
    },
    cta: {
      headline: "Ready to Find Your New Best Friend?",
      body_text: "Browse our available dogs, submit an application, or learn how you can help support our mission.",
      button_text: "Start Your Adoption Journey",
      button_link: "/our-animals"
    },
    faq_section: {
      headline: "Frequently Asked Questions",
      subheadline: "FAQ",
      body_text: "Get answers to common questions about our adoption process."
    }
  },
  about: {
    hero: {
      headline: "About Mission Bay Puppy Rescue",
      subheadline: "Our Story",
      body_text: "Learn about our mission, values, and the dedicated team working to save dogs in need.",
      background_image_url: "/assets/images/about-hero.jpg"
    },
    mission: {
      headline: "Our Mission",
      subheadline: "Why We Exist",
      body_text: "Every dog deserves a loving home. We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area."
    },
    team: {
      headline: "Meet Our Team",
      subheadline: "The People Behind the Mission",
      body_text: "Our dedicated volunteers and staff work tirelessly to give every dog a second chance."
    }
  },
  contact: {
    hero: {
      headline: "Get in Touch",
      subheadline: "Contact Us",
      body_text: "Have questions about adoption, volunteering, or how you can help? We'd love to hear from you.",
      background_image_url: "/assets/images/contact-hero.jpg"
    },
    contact_info: {
      headline: "Contact Information",
      subheadline: "Reach Out",
      body_text: "Get in touch with us through any of the following methods."
    }
  },
  animals: {
    hero: {
      headline: "Meet Our Available Dogs",
      subheadline: "Find Your New Best Friend",
      body_text: "Browse our current dogs available for adoption and find your perfect match.",
      background_image_url: "/assets/images/animals-hero.jpg"
    },
    adoption_process: {
      headline: "Adoption Process",
      subheadline: "How It Works",
      body_text: "Learn about our simple adoption process and how to welcome a new family member."
    }
  },
  donate: {
    hero: {
      headline: "Support Our Mission",
      subheadline: "Make a Difference",
      body_text: "Your donation helps us rescue, care for, and rehome dogs in need.",
      background_image_url: "/assets/images/donate-hero.jpg"
    },
    impact: {
      headline: "Your Impact",
      subheadline: "How Your Donation Helps",
      body_text: "See how your contribution directly supports our rescue efforts."
    }
  },
  events: {
    hero: {
      headline: "Upcoming Events",
      subheadline: "Join Us",
      body_text: "Attend our adoption events, fundraisers, and community gatherings.",
      background_image_url: "/assets/images/events-hero.jpg"
    },
    upcoming: {
      headline: "Upcoming Events",
      subheadline: "Mark Your Calendar",
      body_text: "Don't miss our upcoming adoption events and fundraisers."
    }
  },
  global: {
    footer: {
      content: {
        footer_organization_name: "Mission Bay Puppy Rescue",
        footer_address_line_one: "123 Main Street",
        footer_address_line_two: "Suite 200",
        footer_address_city: "San Diego",
        footer_address_state: "CA",
        footer_address_zip: "92109",
        footer_phone: "555-555-5555",
        footer_email: "info@mbpr.org",
        footer_ein: "87-2984609",
        footer_copyright: `© ${new Date().getFullYear()} Mission Bay Puppy Rescue. All rights reserved.`
      }
    }
  }
};

const DEFAULT_ORG = {
  id: 9,
  org: 'Mission Bay Puppy Rescue',
  name: 'Mission Bay Puppy Rescue',
  slug: 'mbpr',
  email: 'info@mbpr.org',
  phone: '555-555-5555',
  address: { lineOne: '123 Main Street', lineTwo: '', city: 'San Diego', state: 'CA', zip: '92109' },
  domain: 'mbpr.org',
  website: 'mbpr.org',
  ein: '87-2984609',
  logo_url: '/assets/images/logo.png',
  primary_color: '#6bb3eb',
  secondary_color: '#047857',
  accent_color: '#059669',
  socialMedia: { facebook: '', instagram: '', twitter: '' }
};

function parseSectionContent(rawContent) {
  if (!rawContent) return {};
  if (typeof rawContent === 'object') return rawContent;
  try { return JSON.parse(rawContent); } catch { return {}; }
}

function normalizeFaqSection(faqSection) {
  if (!faqSection || typeof faqSection !== 'object') return {};

  const nestedContent = typeof faqSection.content === 'object' && faqSection.content !== null
    ? faqSection.content : {};
  const merged = { ...nestedContent, ...faqSection };

  if (Array.isArray(merged.faqs)) {
    merged.faqs.forEach((item, index) => {
      const question = item?.question ?? item?.headline ?? '';
      const answer = item?.answer ?? item?.body ?? item?.body_text ?? '';
      const slot = index + 1;
      merged[`faq_question_${slot}`] = question;
      merged[`faq_answer_${slot}`] = answer;
    });
  }

  const extractedFaqs = [];
  for (let i = 1; i <= 10; i++) {
    const question = merged[`faq_question_${i}`] ?? merged[`faq_${i}_question`] ?? null;
    const answer = merged[`faq_answer_${i}`] ?? merged[`faq_${i}_answer`] ?? null;
    if (question || answer) {
      merged[`faq_question_${i}`] = question || '';
      merged[`faq_answer_${i}`] = answer || '';
      extractedFaqs.push({ question: question || '', answer: answer || '' });
    }
  }

  if (!Array.isArray(merged.faqs) || !merged.faqs.length) {
    merged.faqs = extractedFaqs;
  }

  return merged;
}

/**
 * Convert a section's typography overrides object into an inline CSS variable string.
 * Apply to the section's wrapper element: style={buildSectionStyle(content.hero?.typography)}
 * CSS variables match those set by /api/branding.css so they shadow the global values locally.
 */
export function buildSectionStyle(typography) {
  if (!typography || typeof typography !== 'object') return '';
  const fontScaleMap = { Small: '0.875rem', Medium: '1rem', Large: '1.125rem', 'Extra Large': '1.25rem' };
  const parts = [];
  if (typography.heading_color) parts.push(`--headerColor: ${typography.heading_color}`);
  if (typography.body_text_color) parts.push(`--bodyTextColor: ${typography.body_text_color}`);
  if (typography.heading_font) parts.push(`--headingFont: '${typography.heading_font}', sans-serif`);
  if (typography.font_size_scale && fontScaleMap[typography.font_size_scale]) {
    parts.push(`--bodyFontSize: ${fontScaleMap[typography.font_size_scale]}`);
  }
  return parts.join('; ');
}

/**
 * Fetch dynamic website content from Supabase.
 */
export async function fetchPageContent(pageSlug = 'homepage', orgId = '9', origin = '') {
  let websiteContent = {};

  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/website_content?select=*&org_id=eq.${orgId}&is_visible=eq.true`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const sections = await res.json();
    console.log(`✅ Fetched ${sections.length} content sections for page: ${pageSlug}, org: ${orgId}`);

    const organizedContent = {};
    sections.forEach(section => {
      if (section.page_slug === pageSlug || section.page_slug === 'global') {
        if (section.section_key === 'footer') {
          organizedContent['footer'] = {
            content: {
              footer_organization_name: section.footer_organization_name,
              footer_address_line_one: section.footer_address_line_one,
              footer_address_line_two: section.footer_address_line_two,
              footer_address_city: section.footer_address_city,
              footer_address_state: section.footer_address_state,
              footer_address_zip: section.footer_address_zip,
              footer_phone: section.footer_phone,
              footer_email: section.footer_email,
              footer_copyright: section.footer_copyright,
              footer_ein: section.footer_ein
            }
          };
        } else {
          const parsedContent = parseSectionContent(section.content);
          const isFaqSection = section.section_key === 'faq' || section.section_key === 'faq_section';
          const targetKey = isFaqSection ? 'faq_section' : section.section_key;

          const combinedSection = {
            ...section,
            ...parsedContent,
            id: section.id,
            section_key: section.section_key,
            page_slug: section.page_slug,
            is_visible: section.is_visible,
            headline: section.headline || parsedContent.headline || section.title,
            subheadline: section.subheadline || parsedContent.subheadline || section.subtitle,
            body_text: section.body_text || parsedContent.body_text || parsedContent.description || section.description,
            button_text: section.button_text || parsedContent.button_text || parsedContent.cta_text,
            button_link: section.button_link || parsedContent.button_link || parsedContent.cta_link,
            background_image_url: section.background_image_url || parsedContent.background_image_url || parsedContent.hero_image_url,
            featured_image_url: section.featured_image_url || parsedContent.featured_image_url || parsedContent.image_url,
            secondary_image_url: section.secondary_image_url || parsedContent.secondary_image_url || null,
            typography: section.typography ?? parsedContent.typography ?? null,
            content: parsedContent
          };

          if (isFaqSection) {
            const normalizedFaq = normalizeFaqSection(combinedSection);
            Object.assign(combinedSection, normalizedFaq);
          }

          Object.keys(parsedContent)
            .filter(k => k.startsWith('faq_question_') || k.startsWith('faq_answer_'))
            .forEach(k => { combinedSection[k] = parsedContent[k]; });

          organizedContent[targetKey] = combinedSection;
        }
      }
    });

    websiteContent = organizedContent;
  } catch (error) {
    console.error(`❌ Error fetching content for ${pageSlug}:`, error);
  }

  if (websiteContent.faq_section || websiteContent.faq) {
    websiteContent.faq_section = normalizeFaqSection(websiteContent.faq_section || websiteContent.faq);
    delete websiteContent.faq;
  }

  const pageDefaults = DEFAULT_CONTENT[pageSlug] || {};
  const globalDefaults = DEFAULT_CONTENT.global || {};

  return { ...pageDefaults, ...globalDefaults, ...websiteContent };
}

/**
 * Fetch organization data from Supabase.
 */
export async function fetchOrganizationData(orgId = '9', origin = '') {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/organizations?select=*&id=eq.${orgId}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const rows = await res.json();
    if (!rows || rows.length === 0) throw new Error('Organization not found');
    const data = rows[0];
    console.log(`✅ Fetched organization data for org ${orgId}`);

    return {
      id: data.id || orgId,
      org: data.name,
      name: data.name,
      slug: data.slug,
      email: data.email,
      phone: data.phone,
      phoneForTel: data.phone,
      phoneFormatted: data.phone,
      address: {
        lineOne: data.address,
        lineTwo: '',
        city: data.city,
        state: data.state,
        zip: data.zip_code,
      },
      domain: data.custom_domain || data.website,
      website: data.website,
      ein: data.ein,
      orgId: orgId,
      logo_url: data.logo_light_url,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      accent_color: data.accent_color,
      socialMedia: {
        facebook: data.facebook_url || '',
        instagram: data.instagram_url || '',
        twitter: data.twitter_url || ''
      }
    };
  } catch (error) {
    console.error(`❌ Error fetching organization data:`, error);
  }

  return { ...DEFAULT_ORG, orgId };
}

/**
 * Fetch both page content and organization data in parallel.
 */
export async function fetchAllPageData(pageSlug = 'homepage', orgId = '9', origin = '') {
  const [content, organization] = await Promise.all([
    fetchPageContent(pageSlug, orgId),
    fetchOrganizationData(orgId)
  ]);

  return { content, organization };
}
