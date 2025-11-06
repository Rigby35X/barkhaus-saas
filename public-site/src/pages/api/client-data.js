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
            dynamicData = {
                name: xanoData.name || clientData.name,
                email: xanoData.email || clientData.email,
                phone: xanoData.phone || clientData.phoneFormatted,
                phoneForTel: xanoData.phone_tel || clientData.phoneForTel,
                phoneFormatted: xanoData.phone || clientData.phoneFormatted,
                address: {
                    lineOne: xanoData.address_line_1 || clientData.address?.lineOne,
                    lineTwo: xanoData.address_line_2 || clientData.address?.lineTwo,
                    city: xanoData.city || clientData.address?.city,
                    state: xanoData.state || clientData.address?.state,
                    zip: xanoData.zip || clientData.address?.zip,
                    mapLink: xanoData.map_link || clientData.address?.mapLink
                },
                domain: xanoData.domain || clientData.domain,
                ein: xanoData.tax_id || clientData.ein, // Map tax_id to ein
                orgId: orgId,
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
