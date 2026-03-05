/**
 * Content Fetcher Utility
 * Fetches dynamic content from Xano directly — no self-referencing proxy calls.
 */

// Default fallback content for different page types
const DEFAULT_CONTENT = {
  // Homepage content
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

  // About page content
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

  // Contact page content
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

  // Our Animals page content
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

  // Donate page content
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

  // Events page content
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

  // Global content (appears on all pages)
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

// Default organization fallback
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

// Make an authenticated GET request to Xano
async function xanoGet(url, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Xano ${res.status}: ${res.statusText}`);
  return res.json();
}

// Safely parse JSON content stored as a string in Xano
function parseSectionContent(rawContent) {
  if (!rawContent) return {};
  if (typeof rawContent === 'object') return rawContent;
  try { return JSON.parse(rawContent); } catch { return {}; }
}

function normalizeFaqSection(faqSection) {
  if (!faqSection || typeof faqSection !== 'object') {
    return {};
  }

  const nestedContent = typeof faqSection.content === 'object' && faqSection.content !== null
    ? faqSection.content
    : {};

  const merged = {
    ...nestedContent,
    ...faqSection
  };

  if (Array.isArray(merged.faqs)) {
    merged.faqs.forEach((item, index) => {
      const question = item?.question ?? item?.headline ?? '';
      const answer = item?.answer ?? item?.body ?? item?.body_text ?? '';
      const slot = index + 1;
      merged[`faq_question_${slot}`] = question;
      merged[`faq_answer_${slot}`] = answer;
      merged[`faq_${slot}_question`] = merged[`faq_${slot}_question`] || question;
      merged[`faq_${slot}_answer`] = merged[`faq_${slot}_answer`] || answer;
    });
  }

  const extractedFaqs = [];
  for (let i = 1; i <= 10; i++) {
    const question =
      merged[`faq_question_${i}`] ??
      merged[`faq_${i}_question`] ??
      null;
    const answer =
      merged[`faq_answer_${i}`] ??
      merged[`faq_${i}_answer`] ??
      null;

    if (question || answer) {
      merged[`faq_question_${i}`] = question || '';
      merged[`faq_answer_${i}`] = answer || '';
      extractedFaqs.push({
        question: question || '',
        answer: answer || ''
      });
    }
  }

  if (!Array.isArray(merged.faqs) || !merged.faqs.length) {
    merged.faqs = extractedFaqs;
  }

  return merged;
}

/**
 * Fetch dynamic website content directly from Xano.
 * @param {string} pageSlug
 * @param {string} orgId
 * @param {string} origin - unused, kept for backward compatibility
 */
export async function fetchPageContent(pageSlug = 'homepage', orgId = '9', origin = '') {
  let websiteContent = {};

  try {
    const contentUrl = import.meta.env.VITE_XANO_CONTENT_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:MU8UozDK';
    const token = import.meta.env.VITE_XANO_CONTENT_TOKEN;

    const sections = await xanoGet(`${contentUrl}/website_content/${orgId}?id=1`, token);
    console.log(`✅ Fetched ${sections.length} content sections for page: ${pageSlug}, org: ${orgId}`);

    // Organize sections by section_key — same logic as the website-content.js GET handler
    const organizedContent = {};
    sections.forEach(section => {
      if ((section.page_slug === pageSlug || section.page_slug === 'global') && section.is_visible) {
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
            content: parsedContent
          };

          if (isFaqSection) {
            const normalizedFaq = normalizeFaqSection(combinedSection);
            Object.assign(combinedSection, normalizedFaq);
          }

          // Preserve faq_question_N / faq_answer_N at the top level
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

  return {
    ...pageDefaults,
    ...globalDefaults,
    ...websiteContent
  };
}

/**
 * Fetch organization data directly from Xano.
 * @param {string} orgId
 * @param {string} origin - unused, kept for backward compatibility
 */
export async function fetchOrganizationData(orgId = '9', origin = '') {
  try {
    const orgsUrl = import.meta.env.VITE_XANO_ORGANIZATIONS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz';
    const token = import.meta.env.VITE_XANO_ORGANIZATIONS_TOKEN;

    const xanoData = await xanoGet(`${orgsUrl}/organizations/${orgId}`, token);
    console.log(`✅ Fetched organization data for org ${orgId}`);

    // Same field mapping as client-data.js GET handler
    return {
      id: xanoData.id || orgId,
      org: xanoData.name,
      name: xanoData.name,
      slug: xanoData.slug,
      email: xanoData.email,
      phone: xanoData.phone,
      phoneForTel: xanoData.phone,
      phoneFormatted: xanoData.phone,
      address: {
        lineOne: xanoData.address,
        lineTwo: '',
        city: xanoData.city,
        state: xanoData.state,
        zip: xanoData.zip_code,
      },
      domain: xanoData.custom_domain || xanoData.website,
      website: xanoData.website,
      ein: xanoData.ein,
      orgId: orgId,
      logo_url: xanoData.logo_light_url,
      primary_color: xanoData.primary_color,
      secondary_color: xanoData.secondary_color,
      accent_color: xanoData.accent_color,
      socialMedia: {
        facebook: xanoData.facebook_url || '',
        instagram: xanoData.instagram_url || '',
        twitter: xanoData.twitter_url || ''
      }
    };
  } catch (error) {
    console.error(`❌ Error fetching organization data:`, error);
  }

  return { ...DEFAULT_ORG, orgId };
}

/**
 * Fetch both page content and organization data in parallel.
 * @param {string} pageSlug
 * @param {string} orgId
 * @param {string} origin - unused, kept for backward compatibility
 */
export async function fetchAllPageData(pageSlug = 'homepage', orgId = '9', origin = '') {
  const [content, organization] = await Promise.all([
    fetchPageContent(pageSlug, orgId),
    fetchOrganizationData(orgId)
  ]);

  return { content, organization };
}
