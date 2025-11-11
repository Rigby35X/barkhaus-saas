/**
 * API Endpoint for Client Data
 * Serves organization data to frontend components
 */

import clientData from '@data/client.json';

// Xano Configuration
const CACHE_CONTROL_HEADER = 'public, s-maxage=300, stale-while-revalidate=600';

const XANO_CONFIG = {
    organizationsUrl: import.meta.env.VITE_XANO_ORGANIZATIONS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz',
    token: import.meta.env.VITE_XANO_ORGANIZATIONS_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'
};

// Helper function to make Xano requests
async function makeXanoRequest(endpoint, options = {}) {
    const url = `${XANO_CONFIG.organizationsUrl}${endpoint}`;
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

// GET - Fetch client data for frontend
export async function GET({ request }) {
    try {
        const url = new URL(request.url);
        const orgId = url.searchParams.get('orgId') || import.meta.env.PUBLIC_ORG_ID || '9';
        
        let dynamicData = {};
        
        try {
            // Fetch dynamic data from Xano
            const xanoData = await makeXanoRequest(`/organizations/${orgId}`);
            console.log('✅ Dynamic organization data fetched from Xano:', xanoData);
            
            // Map Xano fields to client data format
            // Xano uses: name, slug, email, phone, address, city, state, zip_code, etc.
            dynamicData = {
                id: xanoData.id || orgId,
                org: xanoData.name || clientData.name, // Map 'name' to 'org'
                name: xanoData.name || clientData.name,
                slug: xanoData.slug || clientData.slug,
                email: xanoData.email || clientData.email,
                phone: xanoData.phone || clientData.phoneFormatted,
                phoneForTel: xanoData.phone || clientData.phoneForTel,
                phoneFormatted: xanoData.phone || clientData.phoneFormatted,
                address: {
                    lineOne: xanoData.address || clientData.address?.lineOne,
                    lineTwo: '', // Xano doesn't have address_line_2
                    city: xanoData.city || clientData.address?.city,
                    state: xanoData.state || clientData.address?.state,
                    zip: xanoData.zip_code || clientData.address?.zip,
                    mapLink: clientData.address?.mapLink
                },
                domain: xanoData.custom_domain || xanoData.website || clientData.domain,
                website: xanoData.website || clientData.domain,
                ein: xanoData.ein || clientData.ein,
                orgId: orgId,
                logo_url: xanoData.logo_light_url || clientData.logo_url,
                primary_color: xanoData.primary_color || clientData.primary_color,
                secondary_color: xanoData.secondary_color || clientData.secondary_color,
                accent_color: xanoData.accent_color || clientData.accent_color,
                socialMedia: {
                    facebook: xanoData.facebook_url || '',
                    instagram: xanoData.instagram_url || '',
                    twitter: xanoData.twitter_url || ''
                }
            };
        } catch (xanoError) {
            console.warn('⚠️ Xano fetch failed, using static client data:', xanoError.message);
            // Use static client data as fallback
            dynamicData = {
                ...clientData,
                orgId: orgId,
                socialMedia: {
                    facebook: '',
                    instagram: '',
                    twitter: ''
                }
            };
        }
        
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
    } catch (error) {
        console.error('Error in client-data API:', error);
        
        // Return static client data as last resort
        const fallbackData = {
            ...clientData,
            orgId: '9',
            socialMedia: {
                facebook: '',
                instagram: '',
                twitter: ''
            }
        };
        
        return new Response(JSON.stringify(fallbackData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': CACHE_CONTROL_HEADER
            }
        });
    }
}

// PUT - Update organization data in Xano
export async function PUT({ request }) {
    try {
        const updateData = await request.json();
        const orgId = updateData.orgId || '9';

        console.log('Updating organization data for orgId:', orgId, updateData);

        // Prepare data for Xano organizations table
        const xanoUpdateData = {
            name: updateData.name,
            email: updateData.email,
            phone: updateData.phoneFormatted,
            phone_tel: updateData.phoneForTel,
            address_line_1: updateData.address?.lineOne,
            address_line_2: updateData.address?.lineTwo,
            city: updateData.address?.city,
            state: updateData.address?.state,
            zip: updateData.address?.zip,
            domain: updateData.domain
        };

        try {
            // Update organization in Xano
            const xanoResponse = await makeXanoRequest(`/organizations/${orgId}`, {
                method: 'PATCH',
                body: JSON.stringify(xanoUpdateData)
            });

            console.log('✅ Organization updated in Xano:', xanoResponse);

            return new Response(JSON.stringify({
                success: true,
                message: 'Organization data updated successfully',
                data: xanoResponse
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (xanoError) {
            console.warn('⚠️ Xano update failed:', xanoError.message);

            // Return success even if Xano fails (graceful degradation)
            return new Response(JSON.stringify({
                success: true,
                message: 'Update processed (Xano unavailable)',
                warning: xanoError.message
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Error updating organization data:', error);

        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update organization data: ' + error.message
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
            'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
