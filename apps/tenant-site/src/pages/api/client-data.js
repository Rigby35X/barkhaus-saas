/**
 * API Endpoint for Client Data
 * Serves organization data to frontend components
 */

import clientData from '@data/client.json';

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

// GET - Fetch client data for frontend
export async function GET({ request, locals }) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || locals.tenant?.orgId?.toString() || import.meta.env.PUBLIC_ORG_ID || '9';

    console.log('🔍 client-data API - orgId:', orgId, 'from tenant:', locals.tenant?.orgId);

    try {
      const res = await fetch(
        `${getSupabaseUrl()}/rest/v1/organizations?select=*&id=eq.${orgId}`,
        { headers: getSupabaseHeaders() }
      );
      if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
      const rows = await res.json();
      if (!rows || rows.length === 0) throw new Error('Organization not found');
      const data = rows[0];
      console.log('✅ Organization data fetched from Supabase:', data.org);

      const dynamicData = {
        id: data.id || orgId,
        org: data.org || clientData.name,
        name: data.org || clientData.name,
        slug: data.slug || clientData.slug,
        email: data.email || clientData.email,
        phone: data.phone || clientData.phoneFormatted,
        phoneForTel: data.phone || clientData.phoneForTel,
        phoneFormatted: data.phone || clientData.phoneFormatted,
        address: {
          lineOne: data.address || clientData.address?.lineOne,
          lineTwo: '',
          city: data.city || clientData.address?.city,
          state: data.state || clientData.address?.state,
          zip: data.zip_code || clientData.address?.zip,
          mapLink: clientData.address?.mapLink
        },
        domain: data.custom_domain || data.website || clientData.domain,
        website: data.website || clientData.domain,
        ein: data.ein || clientData.ein,
        orgId: orgId,
        logo_url: data.logo_light_url || clientData.logo_url,
        primary_color: data.primary_color || clientData.primary_color,
        secondary_color: data.secondary_color || clientData.secondary_color,
        accent_color: data.accent_color || clientData.accent_color,
        socialMedia: {
          facebook: data.facebook_url || '',
          instagram: data.instagram_url || '',
          twitter: data.twitter_url || ''
        }
      };

      return new Response(JSON.stringify(dynamicData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': CACHE_CONTROL_HEADER
        }
      });

    } catch (fetchError) {
      console.warn('⚠️ Supabase fetch failed, using static client data:', fetchError.message);
      return new Response(JSON.stringify({ ...clientData, orgId, socialMedia: { facebook: '', instagram: '', twitter: '' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL_HEADER }
      });
    }

  } catch (error) {
    console.error('Error in client-data API:', error);
    return new Response(JSON.stringify({ ...clientData, orgId: '9', socialMedia: { facebook: '', instagram: '', twitter: '' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL_HEADER }
    });
  }
}

// PUT - Update organization data in Supabase
export async function PUT({ request }) {
  try {
    const updateData = await request.json();
    const orgId = updateData.orgId || '9';

    console.log('Updating organization data for orgId:', orgId);

    const supabaseUpdateData = {
      org: updateData.name,
      email: updateData.email,
      phone: updateData.phoneFormatted,
      address: updateData.address?.lineOne,
      city: updateData.address?.city,
      state: updateData.address?.state,
      zip_code: updateData.address?.zip,
      website: updateData.domain
    };

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/organizations?id=eq.${orgId}`,
      { method: 'PATCH', headers: getSupabaseHeaders(), body: JSON.stringify(supabaseUpdateData) }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const result = await res.json();
    console.log('✅ Organization updated in Supabase');

    return new Response(JSON.stringify({ success: true, message: 'Organization data updated successfully', data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating organization data:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to update organization data: ' + error.message }), {
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
