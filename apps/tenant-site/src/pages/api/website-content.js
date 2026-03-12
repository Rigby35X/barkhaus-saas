/**
 * API Endpoint for Website Content
 * Fetches and updates dynamic content from Supabase
 */

export const prerender = false;

const CACHE_CONTROL_HEADER = 'public, s-maxage=30, stale-while-revalidate=60';

function getSupabaseHeaders() {
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function getSupabaseUrl() {
  return import.meta.env.PUBLIC_SUPABASE_URL;
}

function parseSectionContent(rawContent) {
  if (!rawContent) return {};
  if (typeof rawContent === 'object') return rawContent;
  try { return JSON.parse(rawContent); } catch { return {}; }
}

function normalizeFaqSectionData(section = {}, parsedContent = {}) {
  const mergedContent = { ...(typeof parsedContent === 'object' && parsedContent !== null ? parsedContent : {}) };
  if (typeof mergedContent.content === 'object' && mergedContent.content !== null) {
    Object.assign(mergedContent, mergedContent.content);
  }
  const fieldFallbacks = ['headline', 'subheadline', 'body_text', 'button_text', 'button_link'];
  fieldFallbacks.forEach(key => {
    if (!mergedContent[key] && section[key]) mergedContent[key] = section[key];
  });
  if (Array.isArray(mergedContent.faqs)) {
    mergedContent.faqs.forEach((item, index) => {
      const slot = index + 1;
      const question = item?.question ?? item?.headline ?? '';
      const answer = item?.answer ?? item?.body ?? item?.body_text ?? '';
      mergedContent[`faq_question_${slot}`] = question;
      mergedContent[`faq_answer_${slot}`] = answer;
    });
  }
  const extractedFaqs = [];
  for (let i = 1; i <= 10; i++) {
    const question = mergedContent[`faq_question_${i}`] ?? mergedContent[`faq_${i}_question`] ?? null;
    const answer = mergedContent[`faq_answer_${i}`] ?? mergedContent[`faq_${i}_answer`] ?? null;
    if (question || answer) {
      mergedContent[`faq_question_${i}`] = question || '';
      mergedContent[`faq_answer_${i}`] = answer || '';
      extractedFaqs.push({ question: question || '', answer: answer || '' });
    }
  }
  if (!Array.isArray(mergedContent.faqs) || !mergedContent.faqs.length) {
    mergedContent.faqs = extractedFaqs;
  }
  return mergedContent;
}

const commonFooter = {
  content: {
    footer_organization_name: "Mission Bay Puppy Rescue",
    footer_address_line_one: "123 Main Street",
    footer_address_city: "San Diego",
    footer_address_state: "CA",
    footer_address_zip: "92109",
    footer_phone: "555-555-5555",
    footer_email: "info@mbpr.org",
    footer_ein: "87-2984609",
    footer_copyright: `© ${new Date().getFullYear()} Mission Bay Puppy Rescue. All rights reserved.`
  }
};

function getFallbackContentForPage(pageSlug) {
  const fallbacks = {
    homepage: {
      hero: { headline: "Every Dog Deserves a Loving Home", subheadline: "Rescue • Love • Adopt", body_text: "At Mission Bay Puppy Rescue, we're dedicated to finding loving homes for dogs in need.", button_text: "Meet Our Dogs", button_link: "/our-animals/" },
      services_header: { headline: "Our Services", subheadline: "What We Do", body_text: "We provide comprehensive rescue services for dogs in need." },
      about_us: { headline: "About Mission Bay Puppy Rescue", subheadline: "About Us", body_text: "Founded in 2020, Mission Bay Puppy Rescue has been dedicated to saving and rehoming dogs throughout San Diego.", button_text: "More About Us", button_link: "/about" },
      cta: { headline: "Ready to Find Your New Best Friend?", body_text: "Browse our available dogs, submit an application, or learn how you can help support our mission.", button_text: "Start Your Adoption Journey", button_link: "/our-animals" },
      footer: commonFooter
    },
    animals: {
      hero: { headline: "Meet Our Animals", subheadline: "Available for Adoption", body_text: "Browse our wonderful animals looking for their forever homes." },
      adoption_process: { headline: "Adoption Process", body_text: "Our adoption process is designed to ensure the best match between you and your new companion." },
      more_info: { headline: "Need More Information?", body_text: "Have questions? We're here to help!", button_text: "Contact Us", button_link: "/contact" },
      footer: commonFooter
    },
    about: { hero: { headline: "About Mission Bay Puppy Rescue", subheadline: "Our Story", body_text: "Learn about our mission and team." }, footer: commonFooter },
    contact: { hero: { headline: "Get in Touch", subheadline: "Contact Us", body_text: "Have questions? We'd love to hear from you." }, footer: commonFooter },
    donate: { hero: { headline: "Support Our Mission", subheadline: "Make a Difference", body_text: "Your donation helps us rescue, care for, and rehome dogs in need." }, footer: commonFooter },
    events: { hero: { headline: "Upcoming Events", subheadline: "Join Us", body_text: "Attend our adoption events and community gatherings." }, footer: commonFooter },
    applications: { hero: { headline: "Get Involved", subheadline: "Applications", body_text: "There are many ways to help animals in need." }, footer: commonFooter }
  };
  return fallbacks[pageSlug] || fallbacks.homepage;
}

export async function GET({ request, locals }) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || locals.tenant?.orgId?.toString() || '9';
    const pageSlug = url.searchParams.get('page') || 'homepage';

    console.log(`🎨 Fetching website content for org ${orgId}, page ${pageSlug}`);

    try {
      const res = await fetch(
        `${getSupabaseUrl()}/rest/v1/website_content?select=*&org_id=eq.${orgId}&is_visible=eq.true`,
        { headers: getSupabaseHeaders() }
      );
      if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
      const sections = await res.json();
      console.log('✅ Website content fetched from Supabase:', sections.length, 'sections');

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
              headline: section.headline || parsedContent.headline,
              subheadline: section.subheadline || parsedContent.subheadline,
              body_text: section.body_text || parsedContent.body_text || parsedContent.description,
              button_text: section.button_text || parsedContent.button_text,
              button_link: section.button_link || parsedContent.button_link,
              background_image_url: section.background_image_url || parsedContent.background_image_url,
              featured_image_url: section.featured_image_url || parsedContent.featured_image_url || parsedContent.image_url,
              secondary_image_url: section.secondary_image_url || parsedContent.secondary_image_url || null,
              content: parsedContent
            };

            if (isFaqSection) {
              const normalizedFaq = normalizeFaqSectionData(section, parsedContent);
              Object.assign(combinedSection, normalizedFaq);
              combinedSection.content = { ...(combinedSection.content || {}), ...normalizedFaq };
            }

            Object.keys(parsedContent)
              .filter(key => key.startsWith('faq_question_') || key.startsWith('faq_answer_'))
              .forEach(key => { combinedSection[key] = parsedContent[key]; });

            organizedContent[targetKey] = combinedSection;
          }
        }
      });

      console.log('📋 Organized content sections:', Object.keys(organizedContent));

      return new Response(JSON.stringify(organizedContent), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': CACHE_CONTROL_HEADER
        }
      });

    } catch (fetchError) {
      console.warn('⚠️ Supabase fetch failed:', fetchError.message);
      return new Response(JSON.stringify(getFallbackContentForPage(pageSlug)), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': CACHE_CONTROL_HEADER }
      });
    }

  } catch (error) {
    console.error('Error in website-content GET:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch website content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  try {
    const requestBody = await request.text();
    if (!requestBody || requestBody.trim() === '') {
      return new Response(JSON.stringify({ success: false, error: 'Request body is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(requestBody);
    } catch (parseError) {
      return new Response(JSON.stringify({ success: false, error: `Invalid JSON: ${parseError.message}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { orgId, sectionKey, content, pageSlug } = parsedData;

    if (!orgId || !sectionKey) {
      return new Response(JSON.stringify({ success: false, error: 'orgId and sectionKey are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎨 Updating website content for org ${orgId}, section ${sectionKey}, page ${pageSlug}`);

    const targetPageSlug = sectionKey === 'footer' ? 'global' : (pageSlug || 'homepage');

    // Find existing record
    const findRes = await fetch(
      `${getSupabaseUrl()}/rest/v1/website_content?select=id&org_id=eq.${orgId}&section_key=eq.${encodeURIComponent(sectionKey)}&page_slug=eq.${encodeURIComponent(targetPageSlug)}`,
      { headers: getSupabaseHeaders() }
    );
    if (!findRes.ok) throw new Error(`Supabase HTTP ${findRes.status}`);
    const existing = await findRes.json();

    const recordData = {
      org_id: parseInt(orgId),
      section_key: sectionKey,
      page_slug: targetPageSlug,
      is_visible: true,
      ...(typeof content === 'object' ? content : {})
    };

    let result;
    if (existing && existing.length > 0) {
      const recordId = existing[0].id;
      const updateRes = await fetch(
        `${getSupabaseUrl()}/rest/v1/website_content?id=eq.${recordId}`,
        { method: 'PATCH', headers: getSupabaseHeaders(), body: JSON.stringify(recordData) }
      );
      if (!updateRes.ok) throw new Error(`Supabase PATCH HTTP ${updateRes.status}`);
      result = await updateRes.json();
      console.log('✅ Content updated in Supabase');
    } else {
      const insertRes = await fetch(
        `${getSupabaseUrl()}/rest/v1/website_content`,
        { method: 'POST', headers: getSupabaseHeaders(), body: JSON.stringify(recordData) }
      );
      if (!insertRes.ok) throw new Error(`Supabase POST HTTP ${insertRes.status}`);
      result = await insertRes.json();
      console.log('✅ Content created in Supabase');
    }

    return new Response(JSON.stringify({ success: true, message: 'Content saved successfully', data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });

  } catch (error) {
    console.error('Error in website-content PUT:', error);
    return new Response(JSON.stringify({ success: false, error: `Failed to update website content: ${error.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
