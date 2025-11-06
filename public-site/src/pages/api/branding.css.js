// Dynamic CSS endpoint for organization branding
// Returns CSS with custom colors and fonts based on organization settings

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

export async function GET({ request }) {
    console.log('🎨 GET /api/branding.css - Dynamic CSS request');
    
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || '9'; // Default to Mission Bay
    
    try {
        // Get branding data from admin branding API (includes fallback support)
        const branding = await makeXanoRequest(`/admin/branding?orgId=${orgId}`);
        console.log('✅ Branding data fetched for CSS:', branding);
        
        // Extract colors with fallbacks
        const primary = branding.colors?.primary || '#804e3f';
        const secondary = branding.colors?.secondary || '#d8c8b6';
        const accent = branding.colors?.accent || '#bfae9b';
        const textColor = branding.colors?.text || '#4d4c4c';
        const backgroundColor = branding.colors?.background || '#ffffff';

        // Generate lighter variants
        const primaryLight = lightenColor(primary, 20);
        const secondaryLight = lightenColor(secondary, 20);

        // Get fonts with fallbacks
        const headingFont = branding.fonts?.heading || 'Noto Serif Display';
        const bodyFont = branding.fonts?.body || 'Poppins';
        
        // Generate Google Fonts import
        const googleFontsUrl = generateGoogleFontsUrl([headingFont, bodyFont]);
        
        // Generate dynamic CSS
        const css = `
/* Dynamic Branding CSS for Organization ${orgId} */
@import url('${googleFontsUrl}');

:root {
    /* Organization Colors */
    --primary: ${primary};
    --primaryLight: ${primaryLight};
    --secondary: ${secondary};
    --secondaryLight: ${secondaryLight};
    --headerColor: ${textColor};
    --bodyTextColor: ${textColor};
    --bodyTextColorWhite: #ffffff;
    
    /* Organization Fonts */
    --headingFont: '${headingFont}', serif;
    --bodyFont: '${bodyFont}', sans-serif;
    
    /* Font Sizes */
    --topperFontSize: clamp(0.8125rem, 1.6vw, 1rem);
    --headerFontSize: clamp(1.9375rem, 3.9vw, 3.0625rem);
    --bodyFontSize: 1rem;
    
    /* Section Padding */
    --sectionPadding: clamp(3.75rem, 7.82vw, 6.25rem) 1rem;
}

/* Apply fonts to elements */
h1, h2, h3, h4, h5, h6,
.cs-title {
    font-family: var(--headingFont) !important;
}

body, p, span, div, a, button,
.cs-text, .cs-topper {
    font-family: var(--bodyFont) !important;
}

/* Button styling with organization colors */
.cs-button-solid {
    background-color: var(--primary) !important;
    color: var(--bodyTextColorWhite) !important;
}

.cs-button-solid:hover {
    background-color: var(--primaryLight) !important;
}

/* Link colors */
a {
    color: var(--primary);
}

a:hover {
    color: var(--primaryLight);
}

/* Header styling */
.cs-topper {
    color: var(--secondary) !important;
}

.cs-title {
    color: var(--headerColor) !important;
}

.cs-text {
    color: var(--bodyTextColor) !important;
}

/* Navigation styling */
#cs-navigation .cs-nav-link {
    color: var(--bodyTextColor);
}

#cs-navigation .cs-nav-link:hover {
    color: var(--primary);
}

/* Footer styling */
#cs-footer {
    background-color: var(--headerColor);
    color: var(--bodyTextColorWhite);
}

/* Custom accent elements */
.accent-color {
    color: var(--secondary) !important;
}

.accent-bg {
    background-color: var(--secondary) !important;
}

/* Organization-specific overrides */
.org-primary {
    color: var(--primary) !important;
}

.org-primary-bg {
    background-color: var(--primary) !important;
}

.org-secondary {
    color: var(--secondary) !important;
}

.org-secondary-bg {
    background-color: var(--secondary) !important;
}
`;

        console.log('📤 Returning dynamic CSS for:', organization.org);
        
        return new Response(css, {
            status: 200,
            headers: { 
                'Content-Type': 'text/css',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            }
        });
        
    } catch (error) {
        console.error('💥 Error generating dynamic CSS:', error);
        
        // Return default Mission Bay CSS
        const defaultCSS = `
/* Default Mission Bay Branding CSS */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap');

:root {
    --primary: #804e3f;
    --primaryLight: #a56552;
    --secondary: #d8c8b6;
    --secondaryLight: #e2d4c6;
    --headerColor: #4d4c4c;
    --bodyTextColor: #4d4c4c;
    --bodyTextColorWhite: #ffffff;
    --headingFont: 'Noto Serif Display', serif;
    --bodyFont: 'Poppins', sans-serif;
}

h1, h2, h3, h4, h5, h6, .cs-title { font-family: var(--headingFont) !important; }
body, p, span, div, a, button, .cs-text, .cs-topper { font-family: var(--bodyFont) !important; }
`;
        
        return new Response(defaultCSS, {
            status: 200,
            headers: { 'Content-Type': 'text/css' }
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
