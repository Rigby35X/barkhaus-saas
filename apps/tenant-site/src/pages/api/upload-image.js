/**
 * API Endpoint for Image Upload
 * Handles image uploads to Supabase Storage
 *
 * MANUAL STEP: Make sure the 'animal-images' bucket exists in Supabase Storage
 * and is set to PUBLIC. Go to Supabase → Storage → New bucket → animal-images → Public
 */

import { createClient } from '@supabase/supabase-js'

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

function getSupabaseAdmin() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST({ request }) {
  const corsHeaders = getCorsHeaders(request)
  try {
    const formData = await request.formData()
    const file = formData.get('image')
    const orgId = formData.get('orgId') || '9'
    const section = formData.get('section') || 'general'

    if (!file || !file.name) {
      return new Response(JSON.stringify({ success: false, error: 'No image file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ success: false, error: 'File size too large. Maximum size is 5MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const filename = `org-${orgId}/${section}-${Date.now()}-${file.name}`
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase.storage
      .from('animal-images')
      .upload(filename, file, { upsert: true })

    if (error) {
      console.error('❌ Supabase storage upload error:', error.message)
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('animal-images')
      .getPublicUrl(data.path ?? filename)

    console.log('✅ Image uploaded to Supabase Storage:', publicUrl)

    return new Response(JSON.stringify({ url: publicUrl, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    const corsHeaders = getCorsHeaders(request)
    console.error('❌ Image upload error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Failed to upload image: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}

export async function OPTIONS({ request }) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  })
}
