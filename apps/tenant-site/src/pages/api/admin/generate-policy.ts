import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = [
  'https://app.barkhaus.io',
  'http://localhost:5173',
  'http://localhost:4321',
]

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://app.barkhaus.io'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}

const POLICY_PROMPTS: Record<string, string> = {
  privacy_policy: `Write a comprehensive Privacy Policy for a nonprofit animal rescue organization. Include sections on: information we collect, how we use it, data sharing, cookies, user rights, contact information, and effective date. Use plain language suitable for a nonprofit website.`,
  cookie_policy: `Write a Cookie Policy for a nonprofit animal rescue organization's website. Cover: what cookies are, the types used (essential, analytics, marketing), how to control cookies, and third-party cookies. Keep it concise and readable.`,
  terms_of_use: `Write Terms of Use for a nonprofit animal rescue organization's website. Include: acceptance of terms, use of content, user conduct, intellectual property, disclaimers, limitation of liability, and governing law.`,
  adoption_agreement: `Write an Adoption Agreement for a nonprofit animal rescue organization. Include: adopter responsibilities, animal care requirements, veterinary care obligations, return policy, spay/neuter requirements, prohibition on transfer, right of rescue to reclaim, and signature lines.`,
  foster_agreement: `Write a Foster Care Agreement for a nonprofit animal rescue organization. Include: foster responsibilities, medical care provided by rescue, expenses policy, prohibited actions, return procedure, liability, and acknowledgment section.`,
  volunteer_waiver: `Write a Volunteer Liability Waiver and Release for a nonprofit animal rescue organization. Include: assumption of risk, waiver of liability, indemnification, emergency medical treatment authorization, and photo/media release option.`,
  photo_media_release: `Write a Photo and Media Release form for a nonprofit animal rescue organization. Cover: consent to use images/videos for promotional purposes, social media use, print materials, scope of license, right to refuse, and signature block.`,
}

export const POST: APIRoute = async ({ request }) => {
  const corsHeaders = getCorsHeaders(request)

  try {
    const body = await request.json() as { orgId?: number; policyType?: string }
    const { orgId, policyType } = body

    if (!policyType || !(policyType in POLICY_PROMPTS)) {
      return new Response(JSON.stringify({ error: 'Invalid policy type.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const apiKey = import.meta.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Fetch org details from Supabase for personalization
    let orgName = 'Our Animal Rescue Organization'
    let orgEmail = ''
    let orgAddress = ''
    if (orgId) {
      try {
        const supabase = createClient(
          import.meta.env.PUBLIC_SUPABASE_URL,
          import.meta.env.PUBLIC_SUPABASE_ANON_KEY
        )
        const { data } = await supabase
          .from('organizations')
          .select('name, contact_email, email, address')
          .eq('id', orgId)
          .single()
        if (data) {
          orgName = (data.name as string) ?? orgName
          orgEmail = (data.contact_email as string) ?? (data.email as string) ?? ''
          orgAddress = (data.address as string) ?? ''
        }
        console.log(`[generate-policy] org data fetched: name=${orgName}, email=${orgEmail}`)
      } catch (e) {
        console.warn('[generate-policy] Could not fetch org data, using defaults:', e)
      }
    }

    const orgContext = [
      `Organization Name: ${orgName}`,
      orgEmail ? `Contact Email: ${orgEmail}` : '',
      orgAddress ? `Address: ${orgAddress}` : '',
    ].filter(Boolean).join('\n')

    const prompt = `${POLICY_PROMPTS[policyType]}

${orgContext}

Format with clear section headers. Write in a professional but approachable tone. Replace any placeholder brackets with the actual organization details provided above.`

    console.log(`[generate-policy] Generating ${policyType} for org ${orgId} (${orgName})`)

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document specialist for nonprofit animal rescue organizations. Write clear, practical policy documents personalized with the organization\'s actual name, email, and address.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json() as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `OpenAI HTTP ${openaiRes.status}`)
    }

    const openaiData = await openaiRes.json() as { choices?: { message?: { content?: string } }[] }
    const content = openaiData.choices?.[0]?.message?.content?.trim() ?? ''

    console.log(`[generate-policy] Generated ${content.length} chars for ${policyType}`)

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    const err = error as Error
    console.error('[generate-policy] error:', err)
    return new Response(JSON.stringify({ error: 'Failed to generate policy', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
