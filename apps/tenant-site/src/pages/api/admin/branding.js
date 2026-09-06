// API endpoint for organization branding management
// Handles GET and PUT requests for custom fonts and colors

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

export async function GET({ request }) {
  console.log('🎨 GET /api/admin/branding');

  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');

  if (!orgId) {
    return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/organizations?select=*&id=eq.${orgId}`,
      { headers: getSupabaseHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const rows = await res.json();
    if (!rows || rows.length === 0) throw new Error('Organization not found');
    const organization = rows[0];
    console.log('✅ Organization fetched from Supabase for branding:', organization.org);

    const branding = {
      fonts: {
        heading: organization.heading_font || 'Inter',
        body: organization.body_font || 'Poppins',
        scale: organization.font_scale || 'Medium',
      },
      colors: {
        primary: organization.primary_color || '#804e3f',
        secondary: organization.secondary_color || '#d8c8b6',
        accent: organization.accent_color || '#bfae9b',
        text: organization.text_color || '#4d4c4c',
        background: organization.background_color || '#ffffff',
        heading: organization.heading_color || '#4d4c4c',
        bodyText: organization.body_text_color || '#4d4c4c',
        link: organization.link_color || '#804e3f',
      },
      logos: {
        dark: organization.logo_dark_url || '',
        light: organization.logo_light_url || '/assets/images/MBPR-White.png',
        favicon: organization.favicon_url || ''
      }
    };

    return new Response(JSON.stringify(branding), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Error fetching branding:', error);

    return new Response(JSON.stringify({
      fonts: { heading: 'Noto Serif Display', body: 'Poppins' },
      colors: { primary: '#804e3f', secondary: '#d8c8b6', accent: '#bfae9b', text: '#4d4c4c', background: '#ffffff' }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  console.log('🎨 PUT /api/admin/branding');

  try {
    const body = await request.json();
    const { orgId, fonts, colors, logos } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabaseData = {
      primary_color: colors?.primary || '#804e3f',
      secondary_color: colors?.secondary || '#d8c8b6',
      accent_color: colors?.accent || '#bfae9b',
      text_color: colors?.text || '#4d4c4c',
      background_color: colors?.background || '#ffffff',
    };

    if (fonts?.heading) supabaseData.heading_font = fonts.heading;
    if (fonts?.body) supabaseData.body_font = fonts.body;
    if (fonts?.scale) supabaseData.font_scale = fonts.scale;
    if (colors?.heading) supabaseData.heading_color = colors.heading;
    if (colors?.bodyText) supabaseData.body_text_color = colors.bodyText;
    if (colors?.link) supabaseData.link_color = colors.link;
    if (logos?.dark !== undefined) supabaseData.logo_dark_url = logos.dark;
    if (logos?.light !== undefined) supabaseData.logo_light_url = logos.light;
    if (logos?.favicon !== undefined) supabaseData.favicon_url = logos.favicon;

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/organizations?id=eq.${orgId}`,
      { method: 'PATCH', headers: getSupabaseHeaders(), body: JSON.stringify(supabaseData) }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const updated = await res.json();
    const updatedOrg = Array.isArray(updated) ? updated[0] : (updated || supabaseData);
    console.log('✅ Branding updated in Supabase');

    return new Response(JSON.stringify({
      success: true,
      message: 'Branding settings saved successfully',
      branding: {
        fonts: { heading: updatedOrg.heading_font, body: updatedOrg.body_font, scale: updatedOrg.font_scale },
        colors: {
          primary: updatedOrg.primary_color,
          secondary: updatedOrg.secondary_color,
          accent: updatedOrg.accent_color,
          text: updatedOrg.text_color,
          background: updatedOrg.background_color,
          heading: updatedOrg.heading_color,
          bodyText: updatedOrg.body_text_color,
          link: updatedOrg.link_color,
        },
        logos: { dark: updatedOrg.logo_dark_url, light: updatedOrg.logo_light_url, favicon: updatedOrg.favicon_url }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Error saving branding:', error);
    return new Response(JSON.stringify({ error: 'Failed to save branding settings', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
