import { requireOrganizationAccess } from '../../../lib/dashboard-auth'

/**
 * API Endpoint for AI-Powered Application/Submission Reply Drafting
 * Accepts dashboard payload: { applicantName, formType, formData, orgName, status }
 *
 * ANTHROPIC_API_KEY must be set server-side only on this app (apps/tenant-site),
 * never with a VITE_ prefix on the dashboard — a VITE_-prefixed var is bundled into
 * the client-side JS and would be visible to every visitor via devtools.
 */

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS({ request }) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}

export async function POST({ request }) {
  const corsHeaders = getCorsHeaders(request)
  try {
    const body = await request.json()
    const access = await requireOrganizationAccess(request, body.orgId, ['owner', 'admin', 'staff'], corsHeaders)
    if ('response' in access) return access.response
    const {
      applicantName = 'the applicant',
      formType = 'application',
      formData = {},
      orgName = 'our rescue',
      status = 'new',
    } = body

    const apiKey = import.meta.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const prompt = `You are a helpful assistant for ${orgName}, an animal rescue organization. Draft a warm, professional reply to this ${formType} application from ${applicantName}. Their application status is: ${status}. Application details: ${JSON.stringify(formData)}. Write only the email body, no subject line. Keep it under 150 words. Be warm and personal.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}))
      throw new Error(err.error?.message ?? `Anthropic HTTP ${anthropicRes.status}`)
    }

    const anthropicData = await anthropicRes.json()
    const content = anthropicData.content?.[0]?.text?.trim() ?? ''

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('draft-reply error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate reply', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
