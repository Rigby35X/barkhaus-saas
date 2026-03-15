/**
 * API Endpoint for AI-Powered Social Media Content Generation
 * Accepts dashboard payload: { platform, animal_id, animal_name, tone, context, org_name }
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  )
}

const ALLOWED_ORIGINS = [
  'https://app.barkhaus.io',
  'http://localhost:5173',
  'http://localhost:4321',
]

function getCorsHeaders(request) {
  const origin = request?.headers?.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://app.barkhaus.io'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS({ request }) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}

export async function POST({ request }) {
  const corsHeaders = getCorsHeaders(request)
  try {
    const body = await request.json()
    const {
      platform = 'facebook',
      animal_id,
      animal_name,
      tone = 'friendly',
      context: customContext = '',
      org_name: orgName = 'our rescue',
    } = body

    const apiKey = import.meta.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Fetch full animal data including photo_url from Supabase
    let animalInfo = animal_name ? `Animal name: ${animal_name}` : ''
    let photoUrl = ''
    if (animal_id) {
      try {
        const { data } = await getSupabase()
          .from('animals')
          .select('name,breed,age,gender,size,description,species,status,photo_url')
          .eq('id', animal_id)
          .single()
        if (data) {
          photoUrl = data.photo_url ?? ''
          animalInfo = [
            `Animal name: ${data.name}`,
            data.breed ? `Breed: ${data.breed}` : '',
            data.description ? `Bio: ${data.description}` : '',
            data.status ? `Status: ${data.status}` : '',
            data.gender ? `Gender: ${data.gender}` : '',
            data.size ? `Size: ${data.size}` : '',
          ].filter(Boolean).join('\n')
        }
      } catch {
        // ignore fetch error, fall back to animal_name
      }
    }

    const platformGuides = {
      facebook: 'Warm and community-focused. 1-2 paragraphs. Encourage sharing.',
      instagram: 'Visual-first. Engaging caption with relevant hashtags. ~150 words.',
      twitter: 'Concise and punchy. Under 280 characters. Include hashtags.',
      linkedin: 'Professional yet compassionate. Community-impact focused.',
      tiktok: 'Fun and energetic. Short caption that complements a video.',
      youtube: 'Compelling description encouraging subscriptions and engagement.',
    }

    const prompt = `You are a social media expert for animal rescue organizations. Write a ${platform} post for ${orgName}.

Tone: ${tone}
Platform guidelines: ${platformGuides[platform] ?? 'Engaging and platform-appropriate.'}
${animalInfo ? `\nAnimal details:\n${animalInfo}` : ''}
${customContext ? `\nAdditional context: ${customContext}` : ''}

Use the animal's real name, breed, and bio from the details above to write a specific, personal post about this individual dog — not a generic rescue post.
Write only the post content — no labels, no preamble.`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a social media expert specializing in animal rescue organizations.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json()
      throw new Error(err.error?.message ?? `OpenAI HTTP ${openaiRes.status}`)
    }

    const openaiData = await openaiRes.json()
    const content = openaiData.choices?.[0]?.message?.content?.trim() ?? ''

    return new Response(JSON.stringify({ content, photo_url: photoUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('generate-social-content error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate content', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
