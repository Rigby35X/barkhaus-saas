/**
 * API Endpoint for AI-Powered Social Media Content Generation
 * Uses OpenAI API to generate social media posts for animal rescue organizations
 */

// OpenAI Configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-1106-preview';

// POST - Generate social media content
export async function POST({ request }) {
    try {
        const body = await request.json();
        const {
            postType,
            platform,
            platformConfig,
            animalData,
            customPrompt,
            tone = 'friendly',
            orgName = 'Mission Bay Puppy Rescue'
        } = body;

        if (!OPENAI_API_KEY) {
            console.log('OpenAI API key not found in environment variables');
            return new Response(JSON.stringify({
                error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('🤖 Generating social content:', { postType, platform, orgName });

        // Build the prompt
        const prompt = buildPrompt(postType, platform, platformConfig, animalData, customPrompt, tone, orgName);

        // Call OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a social media expert specializing in animal rescue organizations. Create engaging, heartwarming content that drives adoptions and community engagement.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const openaiData = await openaiResponse.json();
        const generatedText = openaiData.choices[0]?.message?.content || '';

        // Parse the response
        const content = extractSection(generatedText, 'CONTENT') || generatedText;
        const hashtags = extractSection(generatedText, 'HASHTAGS') || '';
        const imagePrompt = extractSection(generatedText, 'IMAGE_PROMPT') || '';

        // Extract animal images if animal data is provided
        let animalImages = [];
        if (animalData && Array.isArray(animalData)) {
            animalImages = animalData
                .filter(animal => animal.image_url)
                .map(animal => ({
                    url: animal.image_url,
                    name: animal.name,
                    description: `${animal.name} - ${animal.breed || 'Mixed breed'}, ${animal.age || 'Age unknown'}`
                }));
        }

        console.log('✅ Social content generated successfully');

        return new Response(JSON.stringify({
            success: true,
            content,
            hashtags,
            imagePrompt,
            animalImages,
            platform,
            postType
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('Error generating social content:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to generate content',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper function to extract sections from generated text
function extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}

// Helper function to build prompts
function buildPrompt(postType, platform, platformConfig, animalData, customPrompt, tone, orgName) {
    // Enhanced platform specifications with content types
    const platformSpecs = {
        facebook: {
            post: 'Facebook post (conversational, community-focused, 1-2 paragraphs)',
            story: 'Facebook story (brief, engaging, call-to-action)',
            event: 'Facebook event description (informative, exciting)',
            fundraiser: 'Facebook fundraiser post (compelling, urgent, emotional)'
        },
        instagram: {
            post: 'Instagram post (visual-first, hashtag-optimized, engaging)',
            story: 'Instagram story (brief, visual, interactive)',
            reel: 'Instagram Reel description (trendy, engaging, short)',
            igtv: 'Instagram IGTV description (detailed, informative)'
        },
        twitter: {
            post: 'Twitter/X post (concise, engaging, under 280 characters)',
            thread: 'Twitter/X thread (connected tweets, storytelling)',
            space: 'Twitter/X Space description (conversational, live)',
            moment: 'Twitter/X Moment description (curated, thematic)'
        },
        linkedin: {
            post: 'LinkedIn post (professional, community-focused, informative)',
            article: 'LinkedIn article (detailed, thought leadership)',
            event: 'LinkedIn event description (professional, networking)',
            company: 'LinkedIn company update (business-focused, engaging)'
        },
        tiktok: {
            video: 'TikTok video description (trendy, engaging, youth-focused)',
            live: 'TikTok live description (interactive, real-time)',
            duet: 'TikTok duet description (collaborative, engaging)',
            challenge: 'TikTok challenge description (viral, participatory)'
        },
        youtube: {
            short: 'YouTube Short description (engaging, hook-focused)',
            video: 'YouTube video description (detailed, SEO-friendly)',
            live: 'YouTube live stream description (exciting, informative)',
            premiere: 'YouTube premiere announcement (anticipation-building)'
        }
    };

    // Get platform-specific content type
    const contentType = platformConfig?.type || 'post';
    const platformSpec = platformSpecs[platform]?.[contentType] || platformSpecs[platform]?.post || `${platform} ${contentType}`;

    // Enhanced audience targeting
    const audienceContext = platformConfig?.audience || platformConfig?.focus || platformConfig?.trend || '';
    const styleContext = platformConfig?.style || '';
    
    // Build audience-specific prompts
    let audiencePrompt = '';
    if (audienceContext) {
        audiencePrompt = `Target this content specifically for: ${audienceContext}. `;
    }
    
    // Enhanced post type templates with audience and style context
    const postTypeTemplates = {
        new_arrival: `Create a ${platformSpec} announcing a new animal arrival at ${orgName}. ${audiencePrompt}Focus on creating excitement and urgency for potential adopters.`,
        adoption_update: `Create a ${platformSpec} celebrating a successful adoption at ${orgName}. ${audiencePrompt}Highlight the happy ending and inspire others to adopt.`,
        fundraiser: `Create a ${platformSpec} for a fundraising campaign at ${orgName}. ${audiencePrompt}Create urgency and emotional connection to drive donations.`,
        volunteer_need: `Create a ${platformSpec} recruiting volunteers for ${orgName}. ${audiencePrompt}Emphasize the rewarding nature of volunteer work and community impact.`,
        success_story: `Create a ${platformSpec} sharing a heartwarming success story from ${orgName}. ${audiencePrompt}Focus on emotional storytelling and positive outcomes.`,
        event: `Create a ${platformSpec} promoting an upcoming event at ${orgName}. ${audiencePrompt}Create excitement and encourage attendance.`,
        general: customPrompt || `Create a ${platformSpec} for ${orgName}. ${audiencePrompt}Engage the community and promote animal welfare.`
    };

    let prompt = postTypeTemplates[postType] || postTypeTemplates.general;

    // Add animal-specific information if provided
    if (animalData && animalData.length > 0) {
        prompt += '\n\nAnimal Information:\n';
        animalData.forEach((animal, index) => {
            prompt += `${index + 1}. ${animal.name || 'Unnamed'} - ${animal.breed || 'Mixed breed'}, ${animal.age || 'Age unknown'}, ${animal.gender || 'Gender unknown'}`;
            if (animal.size) prompt += `, ${animal.size} size`;
            if (animal.description) prompt += `. ${animal.description}`;
            if (animal.special_needs) prompt += ` Special needs: ${animal.special_needs}`;
            prompt += '\n';
        });
    }

    // Add style and trend context
    if (styleContext) {
        prompt += `\n\nStyle Requirements: ${styleContext}`;
    }

    // Enhanced platform-specific guidelines
    const platformGuidelines = {
        facebook: 'Use a warm, community-focused tone. Encourage comments and shares. Include emotional storytelling.',
        instagram: 'Focus on visual appeal. Use relevant hashtags. Create Instagram-worthy moments.',
        twitter: 'Be concise and engaging. Use trending hashtags appropriately. Encourage retweets.',
        linkedin: 'Maintain a professional yet compassionate tone. Focus on community impact and volunteer opportunities.',
        tiktok: 'Use trendy language and current slang appropriately. Focus on entertainment value while maintaining the mission.',
        youtube: 'Create compelling descriptions that encourage views and subscriptions. Include relevant keywords.'
    };

    prompt += `\n\nPlatform Guidelines: ${platformGuidelines[platform] || 'Create engaging, shareable content appropriate for the platform.'}`;

    // Final enhanced prompt with comprehensive instructions
    prompt = `${prompt}

The content should be fresh, relevant, and align with current ${platform} trends. Focus on creating content that encourages interaction, sharing, and meaningful engagement with the animal rescue community.

Consider these engagement strategies:
- Use storytelling to create emotional connections
- Include clear calls-to-action
- Leverage current social media trends appropriately
- Create content that encourages user-generated content
- Build community and foster relationships

Tone: ${tone}
Platform: ${platform} (${contentType})
${styleContext ? `Style: ${styleContext}` : ''}
${audienceContext ? `Target Audience: ${audienceContext}` : ''}

Please format your response as:
CONTENT: [the social media post content optimized for ${platform} ${contentType}]
HASHTAGS: [relevant hashtags separated by commas, optimized for ${platform}]
IMAGE_PROMPT: [a brief description for an image that would accompany this post, considering ${platform} visual requirements]`;

    // Add platform-specific link if provided
    if (platformConfig?.link) {
        prompt += `\nINCLUDE_LINK: ${platformConfig.link}`;
    }

    return prompt;
}

// OPTIONS handler for CORS
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
