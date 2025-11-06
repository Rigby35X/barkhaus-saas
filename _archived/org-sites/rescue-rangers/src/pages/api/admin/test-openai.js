/**
 * Test endpoint to verify OpenAI API connection
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function GET() {
    try {
        console.log('Testing OpenAI API connection...');
        console.log('API Key present:', !!OPENAI_API_KEY);
        console.log('API Key format:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}` : 'undefined');
        console.log('API Key length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0);

        if (!OPENAI_API_KEY) {
            return new Response(JSON.stringify({ 
                error: 'OpenAI API key not configured',
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

        return new Response(JSON.stringify({ 
            success: true,
            message: 'OpenAI API connection successful',
            modelsCount: data.data ? data.data.length : 0,
            debug: {
                keyPresent: true,
                keyFormat: `${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}`,
                keyLength: OPENAI_API_KEY.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('OpenAI test error:', error);
        return new Response(JSON.stringify({ 
            error: 'OpenAI test failed',
            details: error.message,
            debug: {
                keyPresent: !!OPENAI_API_KEY,
                keyFormat: OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}` : 'undefined',
                keyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0
            }
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
