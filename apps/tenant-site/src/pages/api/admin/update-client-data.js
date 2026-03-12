/**
 * API Endpoint for Updating Client Data
 * Updates organization data that affects the frontend website
 */

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

// POST - Update client data (organization info that affects frontend)
export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('📝 Client data update request body:', body);

    const orgId = body.orgId || '9';

    const clientData = {
      name: body.name || 'Mission Bay Puppy Rescue',
      email: body.email || 'kristin@mbpr.org',
      phone: body.phone || '555 555-5555',
      address: body.address || '1234 Bayside Walk, San Diego, CA 92109',
      city: body.city || '',
      state: body.state || '',
      zip_code: body.zip || '',
      ein: body.ein || body.tax_id || '12-345678',
      website: body.website || 'mbpr.org',
      facebook_url: body.facebook || '',
      instagram_url: body.instagram || '',
      contact_email: body.contact_email || body.email || 'info@mbpr.org'
    };

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/organizations?id=eq.${orgId}`,
      { method: 'PATCH', headers: getSupabaseHeaders(), body: JSON.stringify(clientData) }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const updatedData = await res.json();
    console.log('✅ Client data updated in Supabase');

    return new Response(JSON.stringify({
      success: true,
      message: 'Client data updated successfully',
      data: updatedData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Error updating client data:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update client data',
      message: error.message
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
