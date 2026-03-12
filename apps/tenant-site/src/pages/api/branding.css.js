// Dynamic CSS endpoint for organization branding
// Returns CSS with custom colors and fonts based on organization settings

function getSupabaseHeaders() {
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

function getSupabaseUrl() {
  return import.meta.env.PUBLIC_SUPABASE_URL;
}

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

function generateGoogleFontsUrl(fonts) {
  const uniqueFonts = [...new Set(fonts)];
  const fontParams = uniqueFonts.map(font => `${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700`).join('&family=');
  return `https://fonts.googleapis.com/css2?family=${fontParams}&display=swap`;
}

export async function GET({ request }) {
  console.log('🎨 GET /api/branding.css - Dynamic CSS request');

  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId') || '9';

  try {
    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/organizations?select=*&id=eq.${orgId}`,
      { headers: getSupabaseHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const rows = await res.json();
    if (!rows || rows.length === 0) throw new Error('Organization not found');
    const organization = rows[0];

    const primary = organization.primary_color || '#804e3f';
    const secondary = organization.secondary_color || '#d8c8b6';
    const accent = organization.accent_color || '#bfae9b';
    const textColor = organization.text_color || '#4d4c4c';
    const backgroundColor = organization.background_color || '#ffffff';
    const primaryLight = lightenColor(primary, 20);
    const secondaryLight = lightenColor(secondary, 20);
    const headingFont = organization.heading_font || 'Noto Serif Display';
    const bodyFont = organization.body_font || 'Poppins';
    const googleFontsUrl = generateGoogleFontsUrl([headingFont, bodyFont]);

    const css = `
/* Dynamic Branding CSS for Organization ${orgId} */
@import url('${googleFontsUrl}');

:root {
    --primary: ${primary};
    --primaryLight: ${primaryLight};
    --secondary: ${secondary};
    --secondaryLight: ${secondaryLight};
    --headerColor: ${textColor};
    --bodyTextColor: ${textColor};
    --bodyTextColorWhite: #ffffff;
    --headingFont: '${headingFont}', serif;
    --bodyFont: '${bodyFont}', sans-serif;
    --topperFontSize: clamp(0.8125rem, 1.6vw, 1rem);
    --headerFontSize: clamp(1.9375rem, 3.9vw, 3.0625rem);
    --bodyFontSize: 1rem;
    --sectionPadding: clamp(3.75rem, 7.82vw, 6.25rem) 1rem;
}

h1, h2, h3, h4, h5, h6, .cs-title { font-family: var(--headingFont) !important; }
body, p, span, div, a, button, .cs-text, .cs-topper { font-family: var(--bodyFont) !important; }
.cs-button-solid { background-color: var(--primary) !important; color: var(--bodyTextColorWhite) !important; }
.cs-button-solid:hover { background-color: var(--primaryLight) !important; }
a { color: var(--primary); }
a:hover { color: var(--primaryLight); }
.cs-topper { color: var(--secondary) !important; }
.cs-title { color: var(--headerColor) !important; }
.cs-text { color: var(--bodyTextColor) !important; }
#cs-navigation .cs-nav-link { color: var(--bodyTextColor); }
#cs-navigation .cs-nav-link:hover { color: var(--primary); }
#cs-footer { background-color: var(--headerColor); color: var(--bodyTextColorWhite); }
.accent-color { color: var(--secondary) !important; }
.accent-bg { background-color: var(--secondary) !important; }
.org-primary { color: var(--primary) !important; }
.org-primary-bg { background-color: var(--primary) !important; }
.org-secondary { color: var(--secondary) !important; }
.org-secondary-bg { background-color: var(--secondary) !important; }
`;

    console.log('📤 Returning dynamic CSS for:', organization.name);

    return new Response(css, {
      status: 200,
      headers: { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=300' }
    });

  } catch (error) {
    console.error('💥 Error generating dynamic CSS:', error);

    return new Response(`
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
`, {
      status: 200,
      headers: { 'Content-Type': 'text/css' }
    });
  }
}
