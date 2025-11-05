# Admin Dashboard Image Upload Fix

## Overview
Fixed the admin dashboard animal management system to properly handle image uploads when adding and editing animals.

## Problem
The admin dashboard had issues with image handling:
- Images were being stored as simple URL strings in the `uploadedImages` array
- When editing animals, the system couldn't distinguish between existing images (URL-only) and new uploads (requiring file upload)
- New images weren't being uploaded to the server before saving animal data
- Editing animals would lose their images or fail to update them properly

## Solution
Updated the image handling system to use a structured object format that tracks both the preview URL and the actual file object for new uploads.

## Changes Made

### 1. Updated `handleFiles()` Function
**File:** `public/admin/barkhaus-admin.html` (lines 4123-4161)

Changed from storing simple URL strings to storing structured objects:
```javascript
uploadedImages.push({
    name: file.name,
    url: e.target.result,  // Preview URL
    file: file             // Actual file object for upload
});
```

This allows the system to:
- Display image previews immediately
- Know which images need to be uploaded to the server
- Distinguish between new uploads and existing images

### 2. Updated `populateForm()` Function
**File:** `public/admin/barkhaus-admin.html` (lines 3898-3944)

Changed to store existing images with `file: null`:
```javascript
uploadedImages.push({
    name: 'Existing image',
    url: animal.image_url,
    file: null  // No file object for existing images
});
```

This ensures existing images are preserved when editing without triggering unnecessary uploads.

### 3. Updated `handleSaveAnimal()` Function
**File:** `public/admin/barkhaus-admin.html` (lines 3946-4072)

Added logic to upload new images before saving animal data:
```javascript
// Check if we have a new image to upload (has a file object)
const newImage = uploadedImages.find(img => img.file !== null && img.file !== undefined);

if (newImage) {
    // Upload the image to the server
    const uploadFormData = new FormData();
    uploadFormData.append('image', newImage.file);
    uploadFormData.append('section', 'animals');
    uploadFormData.append('orgId', currentOrgId || '9');
    
    const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData
    });
    
    // Get the uploaded image URL
    const uploadResult = await uploadResponse.json();
    imageUrl = uploadResult.imageUrl;
}
```

### 4. Updated `updateImagePreview()` Function
**File:** `public/admin/barkhaus-admin.html` (lines 4163-4212)

Added support for both string URLs (legacy) and object format (new):
```javascript
const imageUrl = typeof image === 'string' ? image : image.url;
```

This ensures backward compatibility while supporting the new structure.

### 5. Updated `removeImage()` Function
**File:** `public/admin/barkhaus-admin.html` (lines 4214-4224)

Added logic to update the main image URL field when removing images:
```javascript
if (uploadedImages.length > 0) {
    const firstImage = uploadedImages[0];
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url;
    document.getElementById('animalImageUrl').value = imageUrl;
} else {
    document.getElementById('animalImageUrl').value = '';
}
```

## API Endpoint
The existing `/api/upload-image` endpoint is already configured and working:
- **Location:** `src/pages/api/upload-image.js`
- **Method:** POST
- **Accepts:** FormData with `image`, `section`, and `orgId` fields
- **Returns:** `{ success: true, imageUrl: "...", filename: "...", size: ..., type: "..." }`
- **Features:**
  - Validates file type (JPEG, PNG, GIF, WebP)
  - Validates file size (5MB limit)
  - Supports Cloudinary upload (if configured)
  - Falls back to data URLs for immediate functionality

## How It Works Now

### Adding a New Animal with Image
1. User drags/drops or selects an image file
2. `handleFiles()` creates a preview and stores the file object
3. User fills in animal details and clicks Save
4. `handleSaveAnimal()` detects the new image (has `file` property)
5. Image is uploaded to `/api/upload-image`
6. Server returns the uploaded image URL
7. Animal data is saved with the uploaded image URL

### Editing an Animal with Existing Image
1. User clicks Edit on an animal
2. `populateForm()` loads existing image as `{ url: "...", file: null }`
3. Image preview displays the existing image
4. User can:
   - Keep the image (no changes needed)
   - Remove and add a new image
   - Just edit other fields
5. `handleSaveAnimal()` checks for new images (with `file` property)
6. If no new image, uses existing URL
7. If new image, uploads it first, then saves

### Replacing an Image
1. User clicks Edit on an animal
2. Existing image is displayed
3. User clicks X to remove existing image
4. User uploads a new image
5. New image is stored with `file` property
6. On save, new image is uploaded and replaces the old one

## Testing

### Test Adding a New Animal
1. Open admin dashboard: `http://localhost:4321/admin/`
2. Click "Add New Animal"
3. Fill in required fields (Name, Species, Status)
4. Drag/drop or click to upload an image
5. Click Save
6. ✅ Verify animal is created with the image

### Test Editing an Animal
1. Click "Edit" on an existing animal
2. ✅ Verify existing image is displayed
3. Change some fields (e.g., name, description)
4. Click Save
5. ✅ Verify changes are saved and image is preserved

### Test Replacing an Image
1. Click "Edit" on an animal with an image
2. Click X to remove the existing image
3. Upload a new image
4. Click Save
5. ✅ Verify new image replaces the old one

## Optional: Cloudinary Configuration

For permanent image storage (recommended for production):

1. Create a Cloudinary account at https://cloudinary.com
2. Get your Cloud Name and Upload Preset
3. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```
4. Restart the dev server

Without Cloudinary, images are stored as data URLs (base64), which works but increases database size.

## Files Modified
- `public/admin/barkhaus-admin.html` - Updated image handling functions

## Files Already in Place
- `src/pages/api/upload-image.js` - Image upload API endpoint (no changes needed)

## Status
✅ **COMPLETE** - Image upload and editing functionality is now working correctly for mission-bay-site.

