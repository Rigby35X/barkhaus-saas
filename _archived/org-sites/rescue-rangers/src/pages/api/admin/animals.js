/**
 * API Endpoint for Animal Management
 * Handles CRUD operations for animals via Xano
 */

// Xano Configuration
const CACHE_CONTROL_HEADER = 'public, s-maxage=300, stale-while-revalidate=600';

const XANO_CONFIG = {
    animalsUrl: import.meta.env.VITE_XANO_ANIMALS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:Od874PbA',
    token: import.meta.env.VITE_XANO_ANIMALS_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'
};

// Helper function to make Xano requests
async function makeXanoRequest(endpoint, options = {}) {
    const url = `${XANO_CONFIG.animalsUrl}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XANO_CONFIG.token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`Xano API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// GET - Fetch all animals for organization
export async function GET({ request }) {
    try {
        const url = new URL(request.url);
        const orgId = url.searchParams.get('orgId') || '3';
        
        const animals = await makeXanoRequest(`/orgs/${orgId}/animals`);
        
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
        console.error('Error fetching animals:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch animals' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST - Create new animal
export async function POST({ request }) {
    try {
        const body = await request.json();
        const { orgId = '3', ...animalData } = body;
        
        // Add organization ID to animal data
        const dataWithOrg = {
            ...animalData,
            org_id: orgId
        };
        
        const newAnimal = await makeXanoRequest(`/orgs/${orgId}/animals`, {
            method: 'POST',
            body: JSON.stringify(dataWithOrg)
        });
        
        return new Response(JSON.stringify(newAnimal), {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Error creating animal:', error);
        return new Response(JSON.stringify({ error: 'Failed to create animal' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// PUT - Update animal
export async function PUT({ request }) {
    try {
        const body = await request.json();
        const { id, orgId = '3', ...animalData } = body;
        
        if (!id) {
            return new Response(JSON.stringify({ error: 'Animal ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const updatedAnimal = await makeXanoRequest(`/orgs/${orgId}/animals/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(animalData)
        });
        
        return new Response(JSON.stringify(updatedAnimal), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Error updating animal:', error);
        return new Response(JSON.stringify({ error: 'Failed to update animal' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE - Remove animal
export async function DELETE({ request }) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const orgId = url.searchParams.get('orgId') || '3';
        
        if (!id) {
            return new Response(JSON.stringify({ error: 'Animal ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await makeXanoRequest(`/orgs/${orgId}/animals/${id}`, {
            method: 'DELETE'
        });
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Error deleting animal:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete animal' }), {
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
