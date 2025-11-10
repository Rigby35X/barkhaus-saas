/**
 * API Endpoint for Website Content
 * Fetches dynamic content from Xano for homepage sections
 */

// Enable server-side rendering for this endpoint
export const prerender = false;

// Xano Configuration
const CACHE_CONTROL_HEADER = 'public, s-maxage=300, stale-while-revalidate=600';

const XANO_CONFIG = {
    contentUrl: import.meta.env.VITE_XANO_CONTENT_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:MU8UozDK',
    token: import.meta.env.VITE_XANO_CONTENT_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'
};

// Helper function to make Xano requests
async function makeXanoRequest(endpoint, options = {}) {
    const url = `${XANO_CONFIG.contentUrl}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XANO_CONFIG.token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`Xano API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Helper function to safely parse JSON content from Xano
function parseSectionContent(rawContent) {
    if (!rawContent) return {};

    if (typeof rawContent === 'object') {
        return rawContent;
    }

    if (typeof rawContent === 'string') {
        try {
            return JSON.parse(rawContent);
        } catch (error) {
            console.warn('⚠️ Failed to parse section content JSON:', error.message);
            return {};
        }
    }

    return {};
}

function normalizeFaqSectionData(section = {}, parsedContent = {}) {
    const mergedContent = {
        ...(typeof parsedContent === 'object' && parsedContent !== null ? parsedContent : {})
    };

    if (typeof mergedContent.content === 'object' && mergedContent.content !== null) {
        Object.assign(mergedContent, mergedContent.content);
    }

    const fieldFallbacks = ['headline', 'subheadline', 'body_text', 'button_text', 'button_link'];
    fieldFallbacks.forEach((key) => {
        if (!mergedContent[key] && section[key]) {
            mergedContent[key] = section[key];
        }
    });

    if (Array.isArray(mergedContent.faqs)) {
        mergedContent.faqs.forEach((item, index) => {
            const slot = index + 1;
            const question = item?.question ?? item?.headline ?? '';
            const answer = item?.answer ?? item?.body ?? item?.body_text ?? '';
            mergedContent[`faq_question_${slot}`] = question;
            mergedContent[`faq_answer_${slot}`] = answer;
            mergedContent[`faq_${slot}_question`] = mergedContent[`faq_${slot}_question`] || question;
            mergedContent[`faq_${slot}_answer`] = mergedContent[`faq_${slot}_answer`] || answer;
        });
    }

    const extractedFaqs = [];
    for (let i = 1; i <= 10; i++) {
        const question =
            mergedContent[`faq_question_${i}`] ??
            mergedContent[`faq_${i}_question`] ??
            null;
        const answer =
            mergedContent[`faq_answer_${i}`] ??
            mergedContent[`faq_${i}_answer`] ??
            null;

        if (question || answer) {
            mergedContent[`faq_question_${i}`] = question || '';
            mergedContent[`faq_answer_${i}`] = answer || '';
            extractedFaqs.push({
                question: question || '',
                answer: answer || ''
            });
        }
    }

    if (!Array.isArray(mergedContent.faqs) || !mergedContent.faqs.length) {
        mergedContent.faqs = extractedFaqs;
    }

    return mergedContent;
}

// Helper function to get fallback content for different pages
function getFallbackContentForPage(pageSlug) {
    const commonFooter = {
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
    };

    const fallbackByPage = {
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
                button_link: "/about"
            },
            what_we_do: {
                headline: "What We Do",
                subheadline: "Our Mission",
                body_text: "We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area."
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
            },
            footer: commonFooter
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
            },
            footer: commonFooter
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
            },
            footer: commonFooter
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
            },
            footer: commonFooter
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
            },
            footer: commonFooter
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
            },
            footer: commonFooter
        },
        contact: {
            hero: {
                headline: "Get in Touch",
                subheadline: "Contact Us",
                body_text: "We'd love to hear from you! Whether you have questions about adoption, want to volunteer, or need support, we're here to help."
            },
            contact_info: {
                address: "456 Mission Bay Drive\nSuite 200\nSan Diego, CA 92109",
                phone: "(619) 555-PUPS",
                email: "info@missionbaypuppyrescue.org",
                hours: "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: 12:00 PM - 4:00 PM\nClosed on major holidays"
            },
            emergency_contact: {
                headline: "Emergency Contact",
                body_text: "For after-hours emergencies involving animals in our care, please contact our emergency hotline.",
                emergency_phone: "(619) 555-HELP"
            },
            footer: commonFooter
        },
        animals: {
            hero: {
                headline: "Meet Our Animals",
                subheadline: "Available for Adoption",
                body_text: "Browse our wonderful animals looking for their forever homes. Each one has a unique personality and story."
            },
            adoption_process: {
                headline: "Adoption Process",
                body_text: "Our adoption process is designed to ensure the best match between you and your new companion. Here's how it works:",
                step_1_title: "Submit Application",
                step_1_description: "Complete our adoption application with information about your lifestyle and preferences.",
                step_2_title: "Meet & Greet",
                step_2_description: "Schedule a meet and greet with your potential new companion.",
                step_3_title: "Home Visit",
                step_3_description: "Our team will conduct a brief home visit to ensure a safe environment."
            },
            more_info: {
                headline: "Need More Information?",
                body_text: "Have questions about our animals or the adoption process? We're here to help! Contact us for more information about any of our available pets.",
                button_text: "Contact Us",
                button_link: "/contact"
            },
            footer: commonFooter
        },
        donate: {
            hero: {
                headline: "Support Our Mission",
                subheadline: "Make a Difference",
                body_text: "Your donation helps us provide medical care, food, shelter, and love to animals in need. Every contribution makes a difference."
            },
            impact: {
                headline: "Your Impact",
                body_text: "See how your donations directly impact the lives of animals in our care.",
                impact_25: "Provides food for one animal for a week",
                impact_50: "Covers basic medical checkup and vaccinations",
                impact_100: "Funds emergency medical treatment"
            },
            footer: commonFooter
        },
        events: {
            hero: {
                headline: "Upcoming Events",
                subheadline: "Join Us",
                body_text: "Join us for adoption events, fundraisers, and community activities. Meet our animals and learn how you can help."
            },
            upcoming: {
                headline: "What's Coming Up",
                body_text: "Check out our upcoming adoption events, fundraisers, and volunteer opportunities."
            },
            footer: commonFooter
        },
        applications: {
            hero: {
                headline: "Get Involved",
                subheadline: "Applications",
                body_text: "There are many ways to help animals in need. Whether you're ready to adopt, want to foster, or volunteer your time, we have opportunities for everyone."
            },
            adoption_application: {
                headline: "Adoption Application",
                body_text: "Ready to welcome a new family member? Our adoption process ensures the perfect match between you and your future pet.",
                requirements: "Requirements:\n• Must be 21 years or older\n• Valid government-issued ID\n• Proof of residence\n• Landlord approval (if renting)\n• Veterinary references (if you've had pets)",
                button_text: "Start Adoption Application"
            },
            foster_application: {
                headline: "Foster Application",
                body_text: "Foster families provide temporary homes for animals while they await adoption. It's a rewarding way to help save lives.",
                requirements: "Requirements:\n• Must be 18 years or older\n• Stable housing situation\n• Time and commitment to care for foster animal\n• Ability to transport to vet appointments\n• Previous pet experience preferred",
                button_text: "Start Foster Application"
            },
            volunteer_application: {
                headline: "Volunteer Application",
                body_text: "Volunteers are the heart of our organization. Whether you have an hour a week or several hours a day, there are meaningful ways to contribute.",
                requirements: "Requirements:\n• Must be 16 years or older (some positions 18+)\n• Reliable and committed\n• Comfortable around animals\n• Able to follow safety protocols\n• Background check required for some positions",
                button_text: "Start Volunteer Application"
            },
            footer: commonFooter
        }
    };

    return fallbackByPage[pageSlug] || fallbackByPage.homepage;
}

// GET - Fetch website content for organization
export async function GET({ request }) {
    try {
        const url = new URL(request.url);
        const orgId = url.searchParams.get('orgId') || '9';
        const pageSlug = url.searchParams.get('page') || 'homepage';
        
        console.log(`🎨 Fetching website content for org ${orgId}, page ${pageSlug}`);
        
        let content;
        try {
            // Fetch content from Xano - Note: Xano expects query parameter, not path parameter
            content = await makeXanoRequest(`/website_content/${orgId}?id=1`);
            console.log('✅ Website content fetched from Xano:', content.length, 'sections');
            
            // Organize content by section_key for easier access
            const organizedContent = {};
            content.forEach(section => {
                // Include content for the requested page OR global content (footer, header, etc.)
                if ((section.page_slug === pageSlug || section.page_slug === 'global') && section.is_visible) {
                    // For footer, structure the content to match what admin expects
                    if (section.section_key === 'footer') {
                        organizedContent[section.section_key] = {
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

                        // Merge parsed content back into section data for easier consumption
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

                        console.log(`📦 Section ${section.section_key} data:`, {
                            headline: combinedSection.headline,
                            body_text: combinedSection.body_text,
                            button_text: combinedSection.button_text
                        });

                        const isFaqSection = section.section_key === 'faq' || section.section_key === 'faq_section';
                        const targetKey = isFaqSection ? 'faq_section' : section.section_key;

                        if (isFaqSection) {
                            const normalizedFaq = normalizeFaqSectionData(section, parsedContent);
                            Object.assign(combinedSection, normalizedFaq);
                            combinedSection.content = {
                                ...(combinedSection.content || {}),
                                ...normalizedFaq
                            };
                        }

                        // Ensure FAQ question/answer pairs remain available at the top level
                        Object.keys(parsedContent)
                            .filter(key => key.startsWith('faq_question_') || key.startsWith('faq_answer_'))
                            .forEach(key => {
                                combinedSection[key] = parsedContent[key];
                            });

                        // Include all section properties for flexible content structure
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
            
        } catch (xanoError) {
            console.warn('⚠️ Xano fetch failed:', xanoError.message);
            
            // Return fallback content based on page
            const fallbackContent = getFallbackContentForPage(pageSlug);
            
            return new Response(JSON.stringify(fallbackContent), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': CACHE_CONTROL_HEADER
                }
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

// PUT - Update website content
export async function PUT({ request }) {
    try {
        // Get the request body as text first, then parse
        const requestBody = await request.text();
        console.log('📝 Raw request body:', requestBody);

        if (!requestBody || requestBody.trim() === '') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Request body is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(requestBody);
        } catch (parseError) {
            return new Response(JSON.stringify({
                success: false,
                error: `Invalid JSON: ${parseError.message}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { orgId, sectionKey, content, pageSlug } = parsedData;

        // Validate required fields
        if (!orgId || !sectionKey) {
            return new Response(JSON.stringify({
                success: false,
                error: 'orgId and sectionKey are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`🎨 Updating website content for org ${orgId}, section ${sectionKey}, page ${pageSlug}`, content);

        try {
            // First, get all content to find the record ID for this section
            console.log('🔍 Finding record ID for section:', sectionKey);
            const allContent = await makeXanoRequest(`/website_content/${orgId}?id=1`);

            // For global content (footer), look for global page_slug; for other sections, look for specific page
            const targetPageSlug = sectionKey === 'footer' ? 'global' : (pageSlug || 'homepage');
            const recordToUpdate = allContent.find(record =>
                record.section_key === sectionKey &&
                record.org_id == orgId &&
                record.page_slug === targetPageSlug
            );

            if (!recordToUpdate) {
                console.log(`📝 No existing record found for section '${sectionKey}', creating new record`);

                // Create new record - footer should be global, others are page-specific
                // Flatten the content object into individual fields for Xano
                const newRecord = {
                    org_id: parseInt(orgId),
                    section_key: sectionKey,
                    page_slug: sectionKey === 'footer' ? 'global' : (pageSlug || 'homepage'),
                    is_visible: true,
                    // Flatten all content fields into the record
                    ...(typeof content === 'object' ? content : {})
                };

                console.log('🚀 Creating new record with data:', JSON.stringify(newRecord, null, 2));

                const createdRecord = await makeXanoRequest(`/website_content/${orgId}`, {
                    method: 'POST',
                    body: JSON.stringify(newRecord)
                });

                console.log('✅ Created new website content record:', createdRecord);

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Content created successfully',
                    data: createdRecord
                }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            console.log('📝 Found record to update:', recordToUpdate.id);

            // Prepare update data - flatten the content object into individual fields
            const updateData = {
                // Flatten all content fields
                ...(typeof content === 'object' ? content : {}),
                updated_at: new Date().toISOString()
            };

            console.log('🚀 Updating record with data:', updateData);

            // Make the PATCH request to update the record
            // Use the correct Xano endpoint with website_content_id parameter
            const xanoUpdateUrl = `https://xz6u-fpaz-praf.n7e.xano.io/api:MU8UozDK/website_content/${recordToUpdate.id}`;
            console.log('🌐 Making PATCH request to:', xanoUpdateUrl);
            console.log('📝 Record ID being updated:', recordToUpdate.id);

            const updateResponse = await fetch(xanoUpdateUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${XANO_CONFIG.token}`
                },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                throw new Error(`Xano PATCH failed: ${updateResponse.status} ${updateResponse.statusText}`);
            }

            const updateResult = await updateResponse.json();

            console.log('✅ Content updated successfully in Xano:', updateResult);

            return new Response(JSON.stringify({
                success: true,
                message: 'Content updated successfully and saved to database!',
                data: updateResult
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });

        } catch (xanoError) {
            console.error('⚠️ Xano update failed:', xanoError.message);

            return new Response(JSON.stringify({
                success: false,
                error: `Failed to update content: ${xanoError.message}`
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Error in website-content PUT:', error);
        return new Response(JSON.stringify({
            success: false,
            error: `Failed to update website content: ${error.message}`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// OPTIONS - Handle CORS preflight
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
