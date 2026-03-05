/**
 * API Endpoint for Testing OpenAI API Connection
 * Used to verify OpenAI API key and connection
 */

// OpenAI Configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// GET - Test OpenAI API connection
export async function GET() {
    try {
        console.log('🧪 Testing OpenAI API connection...');
        
        if (!OPENAI_API_KEY) {
            console.log('❌ OpenAI API key not found in environment variables');
            return new Response(JSON.stringify({
                error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.',
                debug: {
                    keyPresent: false,
                    envVars: Object.keys(import.meta.env).filter(key => key.includes('OPENAI'))
                }
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Test with a simple API call
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log('OpenAI API Response Status:', response.status);
        console.log('OpenAI API Response:', responseText.substring(0, 200));

        if (!response.ok) {
            return new Response(JSON.stringify({ 
                error: 'OpenAI API test failed',
                status: response.status,
                response: responseText,
                debug: {
                    keyPresent: true,
                    keyFormat: `${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}`,
                    keyLength: OPENAI_API_KEY.length
                }
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = JSON.parse(responseText);
        
        console.log('✅ OpenAI API test successful');
        return new Response(JSON.stringify({ 
            success: true,
            message: 'OpenAI API connection successful',
            availableModels: data.data?.slice(0, 5).map(model => model.id) || [],
            debug: {
                keyPresent: true,
                keyFormat: `${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}`,
                keyLength: OPENAI_API_KEY.length,
                totalModels: data.data?.length || 0
            }
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('Error testing OpenAI API:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to test OpenAI API',
            details: error.message,
            debug: {
                keyPresent: !!OPENAI_API_KEY,
                keyFormat: OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}` : 'N/A',
                keyLength: OPENAI_API_KEY?.length || 0
            }
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
