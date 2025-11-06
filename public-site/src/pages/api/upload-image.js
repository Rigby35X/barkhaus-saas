/**
 * API Endpoint for Image Upload
 * Handles image uploads for website content sections using Cloudinary
 */

export async function POST({ request }) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');
        const section = formData.get('section') || 'general';
        const orgId = formData.get('orgId') || '9';

        if (!image || !image.name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No image file provided'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(image.type)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (image.size > maxSize) {
            return new Response(JSON.stringify({
                success: false,
                error: 'File size too large. Maximum size is 5MB.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Convert image to base64 for Cloudinary upload
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataURI = `data:${image.type};base64,${base64}`;

        // Generate unique public_id
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const publicId = `mission-bay/${section}/${orgId}/${timestamp}-${randomId}`;

        // Try to upload to Cloudinary if configured, otherwise use temporary solution
        const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const cloudinaryUploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

        if (cloudinaryCloudName && cloudinaryUploadPreset) {
            try {
                console.log('🔄 Uploading to Cloudinary...');

                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`;

                const cloudinaryFormData = new FormData();
                cloudinaryFormData.append('file', dataURI);
                cloudinaryFormData.append('upload_preset', cloudinaryUploadPreset);
                cloudinaryFormData.append('public_id', publicId);
                cloudinaryFormData.append('folder', `mission-bay/${section}`);

                const cloudinaryResponse = await fetch(cloudinaryUrl, {
                    method: 'POST',
                    body: cloudinaryFormData
                });

                if (cloudinaryResponse.ok) {
                    const cloudinaryResult = await cloudinaryResponse.json();
                    console.log('✅ Image uploaded to Cloudinary:', cloudinaryResult.secure_url);

                    return new Response(JSON.stringify({
                        success: true,
                        imageUrl: cloudinaryResult.secure_url,
                        filename: image.name,
                        size: image.size,
                        type: image.type,
                        cloudinaryId: cloudinaryResult.public_id,
                        message: 'Image uploaded successfully to Cloudinary'
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } catch (cloudinaryError) {
                console.warn('⚠️ Cloudinary upload failed:', cloudinaryError.message);
            }
        }

        // Fallback: Use data URL for immediate functionality
        console.log('📝 Using data URL fallback (configure Cloudinary for permanent storage)');

        return new Response(JSON.stringify({
            success: true,
            imageUrl: dataURI,
            filename: image.name,
            size: image.size,
            type: image.type,
            message: 'Image processed successfully (temporary data URL - configure Cloudinary for permanent storage)',
            temporary: true
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Image upload error:', error);

        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to upload image: ' + error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle OPTIONS for CORS
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
