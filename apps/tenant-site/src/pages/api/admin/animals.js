/**
 * API Endpoint for Animal Management
 * Handles CRUD operations for animals via Supabase
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

// GET - Fetch all animals for organization
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || '9';

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/animals?select=*&org_id=eq.${orgId}&order=name.asc`,
      { headers: getSupabaseHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const animals = await res.json();
    console.log(`✅ Animals fetched from Supabase: ${animals.length} for org ${orgId}`);

    return new Response(JSON.stringify(animals), {
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
    console.error('Error in animals GET:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch animals' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// POST - Create new animal
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { orgId = '9', ...animalData } = body;

    const newRecord = {
      org_id: parseInt(orgId),
      ...animalData
    };

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/animals`,
      { method: 'POST', headers: getSupabaseHeaders(), body: JSON.stringify(newRecord) }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase HTTP ${res.status}: ${errText}`);
    }
    const created = await res.json();
    const newAnimal = Array.isArray(created) ? created[0] : created;
    console.log('✅ Animal created in Supabase:', newAnimal?.id);

    return new Response(JSON.stringify(newAnimal), {
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    console.error('Error creating animal:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create animal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT - Update animal
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const { id, orgId = '9', ...animalData } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Animal ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/animals?id=eq.${id}`,
      { method: 'PATCH', headers: getSupabaseHeaders(), body: JSON.stringify(animalData) }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase HTTP ${res.status}: ${errText}`);
    }
    const updated = await res.json();
    const updatedAnimal = Array.isArray(updated) ? updated[0] : updated;
    console.log('✅ Animal updated in Supabase:', id);

    return new Response(JSON.stringify(updatedAnimal || { id, ...animalData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    console.error('Error updating animal:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to update animal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE - Delete animal
export async function DELETE({ request }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const orgId = url.searchParams.get('orgId') || '9';

    if (!id) {
      return new Response(JSON.stringify({ error: 'Animal ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch(
      `${getSupabaseUrl()}/rest/v1/animals?id=eq.${id}&org_id=eq.${orgId}`,
      { method: 'DELETE', headers: getSupabaseHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    console.log('✅ Animal deleted from Supabase:', id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    console.error('Error deleting animal:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to delete animal' }), {
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
