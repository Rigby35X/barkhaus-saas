// Public API endpoint for frontend branding
// Returns organization's custom fonts and colors for dynamic styling

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

function generateGoogleFontsUrl(fonts) {
  const uniqueFonts = [...new Set(fonts)];
  const fontParams = uniqueFonts.map(font => `${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700`).join('&family=');
  return `https://fonts.googleapis.com/css2?family=${fontParams}&display=swap`;
}

export async function GET({ request }) {
  console.log('🎨 GET /api/branding - Frontend branding request');

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
    console.log('✅ Organization fetched for branding:', organization.name);

    const branding = {
      fonts: {
        heading: organization.heading_font || 'Noto Serif Display',
        body: organization.body_font || 'Poppins',
        googleFontsUrl: generateGoogleFontsUrl([
          organization.heading_font || 'Noto Serif Display',
          organization.body_font || 'Poppins'
        ])
      },
      colors: {
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
        name: organization.name,
        slug: organization.slug
      }
    };

    return new Response(JSON.stringify(branding), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
    });

  } catch (error) {
    console.error('💥 Error fetching frontend branding:', error);

    return new Response(JSON.stringify({
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
      organization: { name: 'Mission Bay Puppy Rescue', slug: 'mbpr' }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
