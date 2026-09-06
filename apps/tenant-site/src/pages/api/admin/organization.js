/**
 * API Endpoint for Organization Management
 * Handles organization data via Supabase
 */

const CACHE_CONTROL_HEADER = 'public, s-maxage=300, stale-while-revalidate=600';

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

// GET - Fetch organization data
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || '9';

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/organizations?select=*&id=eq.${orgId}`,
      { headers: getSupabaseHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const rows = await res.json();
    if (!rows || rows.length === 0) throw new Error('Organization not found');
    const data = rows[0];
    console.log('✅ Organization fetched from Supabase:', data.org);

    const organization = {
      id: data.id,
      name: data.org,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city || '',
      state: data.state || '',
      zip: data.zip_code || '',
      ein: data.ein,
      tax_id: data.ein,
      website: data.website,
      facebook: data.facebook_url,
      instagram: data.instagram_url,
      contact_email: data.contact_email
    };

    return new Response(JSON.stringify(organization), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': CACHE_CONTROL_HEADER
      }
    });

  } catch (error) {
    console.error('Error fetching organization:', error);
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || '9';

    return new Response(JSON.stringify({
      id: orgId,
      name: 'Mission Bay Puppy Rescue',
      email: 'admin@mbpr.org',
      phone: '(619) 555-PUPS',
      address: '456 Mission Bay Drive, Suite 200, San Diego, CA 92109',
      tax_id: '98-7654321'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL_HEADER }
    });
  }
}

// PUT - Update organization data
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const orgId = body.orgId || url.searchParams.get('orgId') || '9';

    const supabaseData = {
      org: body.name || body.org,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      zip_code: body.zip,
      ein: body.ein || body.tax_id,
      website: body.website,
      facebook_url: body.facebook,
      instagram_url: body.instagram,
      contact_email: body.contact_email || body.email
    };

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/organizations?id=eq.${orgId}`,
      { method: 'PATCH', headers: getSupabaseHeaders(), body: JSON.stringify(supabaseData) }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const updated = await res.json();
    console.log('✅ Organization updated in Supabase');

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Error updating organization:', error);
    return new Response(JSON.stringify({ error: 'Failed to update organization' }), {
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
