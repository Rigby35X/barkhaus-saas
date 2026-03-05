// Public API endpoint for frontend branding
// Returns organization's custom fonts and colors for dynamic styling

const XANO_BASE_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz';
const XANO_TOKEN = '165XkoniNXylFdNKgO_aCvmAIcQ';

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

    const response = await fetch(url, config);
    
    if (!response.ok) {
        throw new Error(`Xano API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

export async function GET({ request }) {
    console.log('🎨 GET /api/branding - Frontend branding request');
    
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || '9'; // Default to Mission Bay
    
    try {
        // Get organization data from Xano
        const organization = await makeXanoRequest(`/organizations/${orgId}`);
        console.log('✅ Organization fetched for branding:', organization.org);
        
        // Extract branding data with fallbacks
        const branding = {
            fonts: {
                heading: organization.heading_font || 'Noto Serif Display',
                body: organization.body_font || 'Poppins',
                // Generate Google Fonts URL
                googleFontsUrl: generateGoogleFontsUrl([
                    organization.heading_font || 'Noto Serif Display',
                    organization.body_font || 'Poppins'
                ])
            },
            colors: {
                // Use existing Xano fields
                primary: organization.primary_color || '#804e3f',
                primaryLight: lightenColor(organization.primary_color || '#804e3f', 20),
                secondary: organization.secondary_color || '#d8c8b6',
                secondaryLight: lightenColor(organization.secondary_color || '#d8c8b6', 20),
                accent: organization.accent_color || '#bfae9b',
                headerColor: organization.text_color || '#4d4c4c',
                bodyTextColor: organization.text_color || '#4d4c4c',
                bodyTextColorWhite: '#ffffff',
                background: organization.background_color || '#ffffff'
            },
            organization: {
                name: organization.org,
                slug: organization.slug
            }
        };

        console.log('📤 Returning frontend branding:', branding);
        
        return new Response(JSON.stringify(branding), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            }
        });
        
    } catch (error) {
        console.error('💥 Error fetching frontend branding:', error);
        
        // Return Mission Bay default branding
        const defaultBranding = {
            fonts: {
                heading: 'Noto Serif Display',
                body: 'Poppins',
                googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap'
            },
            colors: {
                primary: '#804e3f',
                primaryLight: '#a56552',
                secondary: '#d8c8b6',
                secondaryLight: '#e2d4c6',
                accent: '#bfae9b',
                headerColor: '#4d4c4c',
                bodyTextColor: '#4d4c4c',
                bodyTextColorWhite: '#ffffff',
                background: '#ffffff'
            },
            organization: {
                name: 'Mission Bay Puppy Rescue',
                slug: 'mbpr'
            }
        };
        
        return new Response(JSON.stringify(defaultBranding), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper function to generate Google Fonts URL
function generateGoogleFontsUrl(fonts) {
    const uniqueFonts = [...new Set(fonts)]; // Remove duplicates
    const fontParams = uniqueFonts.map(font => {
        // Convert font name to Google Fonts format
        const fontName = font.replace(/\s+/g, '+');
        return `${fontName}:wght@300;400;500;600;700`;
    }).join('&family=');
    
    return `https://fonts.googleapis.com/css2?family=${fontParams}&display=swap`;
}

// Helper function to lighten a color
function lightenColor(color, percent) {
    if (!color || !color.startsWith('#')) return color;
    
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}
