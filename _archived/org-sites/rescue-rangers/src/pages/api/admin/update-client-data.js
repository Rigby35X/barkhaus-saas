/**
 * API Endpoint for Updating Client Data
 * Updates the client.json file with organization settings
 */

import fs from 'fs';
import path from 'path';

// POST - Update client data file
export async function POST({ request }) {
    try {
        const body = await request.json();
        const { name, email, phone, ein, address, city, state, zip, website } = body;
        
        // Format phone for different uses
        const phoneForTel = phone ? phone.replace(/[^\d]/g, '') : '';
        const phoneFormatted = phone || '';
        
        // Create updated client data
        const clientData = {
            name: name || 'Happy Paws Dog Rescue',
            email: email || 'info@happypawsrescue.org',
            phoneForTel: phoneForTel,
            phoneFormatted: phoneFormatted,
            ein: ein || '',
            address: {
                lineOne: address || '123 Rescue Lane',
                lineTwo: 'Suite 100',
                city: city || 'Dog City',
                state: state || 'CA',
                zip: zip || '90210',
                mapLink: 'https://maps.google.com/your-location'
            },
            domain: website ? website.replace(/^https?:\/\//, '') : 'happypawsrescue.org'
        };
        
        // Get the path to client.json
        const clientJsonPath = path.join(process.cwd(), 'src', 'data', 'client.json');
        
        // Write the updated data
        fs.writeFileSync(clientJsonPath, JSON.stringify(clientData, null, 2));
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Client data updated successfully',
            data: clientData 
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        console.error('Error updating client data:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to update client data',
            details: error.message 
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
