/**
 * API Endpoint for Image Upload
 * Handles image uploads to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST({ request }) {
  try {
    const formData = await request.formData()
    const file = formData.get('image')
    const orgId = formData.get('orgId') || '9'
    const section = formData.get('section') || 'general'

    if (!file || !file.name) {
      return new Response(JSON.stringify({ success: false, error: 'No image file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ success: false, error: 'File size too large. Maximum size is 5MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const filename = `org-${orgId}/${section}-${Date.now()}-${file.name}`
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase.storage
      .from('animal-images')
      .upload(filename, file, { upsert: true })

    if (error) {
      console.error('❌ Supabase storage upload error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('animal-images')
      .getPublicUrl(filename)

    console.log('✅ Image uploaded to Supabase Storage:', publicUrl)

    return new Response(JSON.stringify({ url: publicUrl, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error) {
    console.error('❌ Image upload error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Failed to upload image: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
