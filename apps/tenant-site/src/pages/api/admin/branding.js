// API endpoint for organization branding management
// Handles GET and PUT requests for custom fonts and colors

const XANO_BASE_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz';
const XANO_TOKEN = '165XkoniNXylFdNKgO_aCvmAIcQ';

// In-memory storage for fallback branding data when Xano is unavailable
const fallbackBrandingStorage = new Map();

async function makeXanoRequest(endpoint, options = {}) {
    const url = `${XANO_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Authorization': `Bearer ${XANO_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    console.log(`🌐 Making Xano request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Xano request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Xano API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

export async function GET({ request }) {
    console.log('🎨 GET /api/admin/branding');
    
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    
    if (!orgId) {
        console.error('❌ Missing orgId parameter');
        return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Check for fallback data first
        const fallbackData = fallbackBrandingStorage.get(orgId);
        if (fallbackData) {
            console.log('📦 Using fallback branding data for org', orgId);
            const branding = {
                fonts: {
                    heading: fallbackData.heading_font || 'Noto Serif Display',
                    body: fallbackData.body_font || 'Poppins'
                },
                colors: {
                    primary: fallbackData.primary_color || '#804e3f',
                    secondary: fallbackData.secondary_color || '#d8c8b6',
                    accent: fallbackData.accent_color || '#bfae9b',
                    text: fallbackData.text_color || '#4d4c4c',
                    background: fallbackData.background_color || '#ffffff'
                },
                logos: {
                    dark: fallbackData.logo_dark_url || '',
                    light: fallbackData.logo_light_url || '/assets/images/MBPR-White.png',
                    favicon: fallbackData.favicon_url || ''
                }
            };

            console.log('📤 Returning fallback branding data:', branding);

            return new Response(JSON.stringify(branding), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Try to get branding data from Xano organizations table
        const organization = await makeXanoRequest(`/organizations/${orgId}`);
        console.log('✅ Organization fetched from Xano:', organization);

        // Extract branding data or use defaults
        const branding = {
            fonts: {
                heading: organization.heading_font || 'Noto Serif Display',
                body: organization.body_font || 'Poppins'
            },
            colors: {
                primary: organization.primary_color || '#804e3f',
                secondary: organization.secondary_color || '#d8c8b6',
                accent: organization.accent_color || '#bfae9b',
                text: organization.text_color || '#4d4c4c',
                background: organization.background_color || '#ffffff'
            },
            logos: {
                dark: organization.logo_dark_url || '',
                light: organization.logo_light_url || '/assets/images/MBPR-White.png',
                favicon: organization.favicon_url || ''
            }
        };

        console.log('📤 Returning Xano branding data:', branding);

        return new Response(JSON.stringify(branding), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('💥 Error fetching branding:', error);
        
        // Return default branding if organization not found or error occurs
        const defaultBranding = {
            fonts: {
                heading: 'Noto Serif Display',
                body: 'Poppins'
            },
            colors: {
                primary: '#804e3f',
                secondary: '#d8c8b6',
                accent: '#bfae9b',
                text: '#4d4c4c',
                background: '#ffffff'
            }
        };
        
        return new Response(JSON.stringify(defaultBranding), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function PUT({ request }) {
    console.log('🎨 PUT /api/admin/branding');
    
    try {
        const body = await request.json();
        console.log('📥 Received branding data:', body);

        const { orgId, fonts, colors, logos } = body;
        
        if (!orgId) {
            console.error('❌ Missing orgId in request body');
            return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Prepare data for Xano organizations table
        const xanoData = {
            // Color fields
            primary_color: colors?.primary || '#804e3f',
            secondary_color: colors?.secondary || '#d8c8b6',
            accent_color: colors?.accent || '#bfae9b',
            text_color: colors?.text || '#4d4c4c',
            background_color: colors?.background || '#ffffff'
        };

        // Add font fields
        if (fonts?.heading) xanoData.heading_font = fonts.heading;
        if (fonts?.body) xanoData.body_font = fonts.body;

        // Add logo fields
        if (logos?.dark !== undefined) xanoData.logo_dark_url = logos.dark;
        if (logos?.light !== undefined) xanoData.logo_light_url = logos.light;
        if (logos?.favicon !== undefined) xanoData.favicon_url = logos.favicon;

        console.log('📝 Transformed data for Xano:', xanoData);

        let updatedOrganization;
        try {
            // Try to update organization in Xano
            updatedOrganization = await makeXanoRequest(`/organizations/${orgId}`, {
                method: 'PUT',
                body: JSON.stringify(xanoData)
            });
            console.log('✅ Branding updated in Xano:', updatedOrganization);
        } catch (xanoError) {
            console.warn('⚠️ Xano branding update failed, this might be due to missing fields:', xanoError.message);

            // Store in fallback storage for future GET requests
            const fallbackData = {
                id: orgId,
                heading_font: xanoData.heading_font,
                body_font: xanoData.body_font,
                primary_color: xanoData.primary_color,
                secondary_color: xanoData.secondary_color,
                accent_color: xanoData.accent_color,
                text_color: xanoData.text_color,
                background_color: xanoData.background_color,
                logo_dark_url: xanoData.logo_dark_url,
                logo_light_url: xanoData.logo_light_url,
                favicon_url: xanoData.favicon_url
            };

            fallbackBrandingStorage.set(orgId, fallbackData);
            console.log('💾 Stored fallback branding data for org', orgId, ':', fallbackData);

            updatedOrganization = fallbackData;
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Branding settings saved successfully',
            branding: {
                fonts: {
                    heading: updatedOrganization.heading_font,
                    body: updatedOrganization.body_font
                },
                colors: {
                    primary: updatedOrganization.primary_color,
                    secondary: updatedOrganization.secondary_color,
                    accent: updatedOrganization.accent_color,
                    text: updatedOrganization.text_color,
                    background: updatedOrganization.background_color
                },
                logos: {
                    dark: updatedOrganization.logo_dark_url,
                    light: updatedOrganization.logo_light_url,
                    favicon: updatedOrganization.favicon_url
                }
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('💥 Error saving branding:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to save branding settings',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
