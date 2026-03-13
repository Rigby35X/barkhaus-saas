import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
)

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

export const POST: APIRoute = async ({ request }) => {
  const corsHeaders = getCorsHeaders(request)
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const orgId = formData.get('orgId') ?? '9'
    const section = formData.get('section') ?? 'general'

    if (!file || typeof file === 'string' || !file.name) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ success: false, error: 'File size too large. Maximum size is 5MB.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const ext = file.name.split('.').pop()
    const filename = `org-${orgId}/${section}-${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('animal-images')
      .upload(filename, buffer, { contentType: file.type, upsert: true })

    if (error) {
      console.error('Supabase storage upload error:', error.message)
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('animal-images').getPublicUrl(data.path ?? filename)

    console.log('Image uploaded:', publicUrl)

    return new Response(JSON.stringify({ url: publicUrl, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: 'Failed to upload image: ' + msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
