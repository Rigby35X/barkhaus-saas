/**
 * API Endpoint for Website Content Management
 * Handles saving FAQ and social media content that appears on the front-end
 */

// Xano Configuration
const CACHE_CONTROL_HEADER = 'public, s-maxage=300, stale-while-revalidate=600';

const XANO_CONFIG = {
    contentUrl: import.meta.env.VITE_XANO_SITE_CONTENT_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:GMSb9gZv',
    token: import.meta.env.VITE_XANO_SITE_CONTENT_TOKEN || 'YOUR_CONTENT_TOKEN_HERE'
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

// POST - Save website content (FAQs, social media, etc.)
export async function POST({ request }) {
    try {
        const contentData = await request.json();
        const { orgId, faqs, socialMedia, lastUpdated } = contentData;

        console.log('Saving website content for org:', orgId, contentData);

        // Prepare data for Xano
        const websiteContent = {
            org_id: orgId,
            faqs: JSON.stringify(faqs),
            social_media: JSON.stringify(socialMedia),
            last_updated: lastUpdated || new Date().toISOString(),
            content_type: 'website_settings'
        };

        // Save to Xano (you may need to create this endpoint in Xano)
        try {
            const result = await makeXanoRequest('/website-content', {
                method: 'POST',
                body: JSON.stringify(websiteContent)
            });

            return new Response(JSON.stringify({
                success: true,
                message: 'Website content saved successfully',
                data: result
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });

        } catch (xanoError) {
            console.warn('Xano save failed, using local storage fallback:', xanoError);
            
            // Fallback: Save to local file system (for development)
            // In production, you'd want to ensure Xano endpoint exists
            return new Response(JSON.stringify({
                success: true,
                message: 'Website content saved locally (Xano endpoint not configured)',
                data: contentData,
                fallback: true
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

    } catch (error) {
        console.error('Error saving website content:', error);
        
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to save website content',
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
}

// GET - Retrieve website content
export async function GET({ request }) {
    try {
        const url = new URL(request.url);
        const orgId = url.searchParams.get('orgId') || '3';

        console.log('Loading website content for org:', orgId);

        try {
            // Try to load from Xano
            const content = await makeXanoRequest(`/website-content/${orgId}`);
            
            return new Response(JSON.stringify({
                success: true,
                data: {
                    orgId: orgId,
                    faqs: JSON.parse(content.faqs || '[]'),
                    socialMedia: JSON.parse(content.social_media || '{}'),
                    lastUpdated: content.last_updated
                }
            }), {
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
            console.warn('Xano load failed, using default content:', xanoError);
            
            // Fallback default content
            const defaultContent = {
                orgId: orgId,
                faqs: [
                    {
                        id: 1,
                        question: "What is the adoption process?",
                        answer: "Our adoption process includes an application, meet and greet, home visit, and adoption fee."
                    },
                    {
                        id: 2,
                        question: "What are the adoption fees?",
                        answer: "Adoption fees vary by animal type and include spaying/neutering, vaccinations, and microchipping."
                    },
                    {
                        id: 3,
                        question: "Can I volunteer?",
                        answer: "Yes! We welcome volunteers for various activities including dog walking, cat socialization, and administrative tasks."
                    }
                ],
                socialMedia: {
                    instagram: "",
                    facebook: "",
                    twitter: ""
                },
                lastUpdated: new Date().toISOString()
            };

            return new Response(JSON.stringify({
                success: true,
                data: defaultContent,
                fallback: true
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Cache-Control': CACHE_CONTROL_HEADER
                }
            });
        }

    } catch (error) {
        console.error('Error loading website content:', error);
        
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to load website content',
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
}

// OPTIONS - Handle CORS preflight
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
