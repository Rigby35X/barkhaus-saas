/**
 * Content Fetcher Utility
 * Reusable utility for fetching dynamic content from Xano across all pages
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
 * Fetch dynamic website content from Xano
 * @param {string} pageSlug - The page slug (homepage, about, contact, etc.)
 * @param {string} orgId - Organization ID (default: 9)
 * @param {string} origin - The origin URL for API calls
 * @returns {Promise<Object>} Content object with fallbacks
 */
export async function fetchPageContent(pageSlug = 'homepage', orgId = '9', origin = '') {
  let websiteContent = {};
  
  try {
    console.log(`🎨 Fetching content for page: ${pageSlug}, org: ${orgId}`);
    
    const response = await fetch(`${origin}/api/website-content?orgId=${orgId}&page=${pageSlug}`);
    
    if (response.ok) {
      websiteContent = await response.json();
      console.log(`✅ Fetched content for ${pageSlug}:`, Object.keys(websiteContent));
    } else {
      console.warn(`⚠️ Failed to fetch content for ${pageSlug}:`, response.status);
    }
  } catch (error) {
    console.error(`❌ Error fetching content for ${pageSlug}:`, error);
  }

  if (websiteContent.faq_section || websiteContent.faq) {
    websiteContent.faq_section = normalizeFaqSection(websiteContent.faq_section || websiteContent.faq);
    delete websiteContent.faq;
  }

  // Merge with default content, prioritizing Xano content
  const pageDefaults = DEFAULT_CONTENT[pageSlug] || {};
  const globalDefaults = DEFAULT_CONTENT.global || {};
  
  return {
    ...pageDefaults,
    ...globalDefaults,
    ...websiteContent
  };
}

/**
 * Get organization data from client-data API
 * @param {string} orgId - Organization ID
 * @param {string} origin - The origin URL for API calls
 * @returns {Promise<Object>} Organization data
 */
export async function fetchOrganizationData(orgId = '9', origin = '') {
  try {
    const response = await fetch(`${origin}/api/client-data?orgId=${orgId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Fetched organization data for org ${orgId}`);
      return data;
    } else {
      console.warn(`⚠️ Failed to fetch organization data:`, response.status);
    }
  } catch (error) {
    console.error(`❌ Error fetching organization data:`, error);
  }

  // Return default organization data
  return {
    id: 9,
    org: 'Mission Bay Puppy Rescue',
    slug: 'mbpr',
    email: 'info@mbpr.org',
    phone: '555-555-5555',
    address: '123 Main Street, San Diego, CA 92109',
    website: 'mbpr.org',
    ein: '87-2984609',
    logo_url: '/assets/images/logo.png',
    primary_color: '#6bb3eb',
    secondary_color: '#047857',
    accent_color: '#059669'
  };
}

/**
 * Create a content object with both page content and organization data
 * @param {string} pageSlug - The page slug
 * @param {string} orgId - Organization ID
 * @param {string} origin - The origin URL for API calls
 * @returns {Promise<Object>} Combined content and organization data
 */
export async function fetchAllPageData(pageSlug = 'homepage', orgId = '9', origin = '') {
  const [content, organization] = await Promise.all([
    fetchPageContent(pageSlug, orgId, origin),
    fetchOrganizationData(orgId, origin)
  ]);

  return {
    content,
    organization
  };
}
