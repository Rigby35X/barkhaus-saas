# Admin Dashboard Image Upload Fix

## Changes Made

### 1. Created Image Upload API Endpoint
**File:** `src/pages/api/admin/upload-image.js`

- Handles image uploads via FormData
- Validates file type (JPEG, PNG, GIF, WebP)
- Validates file size (5MB limit)
- Supports Cloudinary integration (if configured)
- Falls back to data URLs for immediate functionality
- Returns uploaded image URL for storage

### 2. Updated Admin Dashboard Image Handling
**File:** `public/admin/index.html`

#### Changes to `handleFiles()` function:
- Now stores both the file object and preview URL
- File object is needed for actual upload to server
- Preview URL is used for immediate display

#### Changes to `handleSaveAnimal()` function:
- Uploads new images to server before saving animal data
- Detects if image is new (has file object) or existing (URL only)
- Shows upload progress to user
- Properly handles both create and update scenarios

#### Changes to `populateForm()` function:
- Loads existing images when editing an animal
- Displays existing images in preview
- Marks existing images (no file object) vs new uploads

#### Changes to `updateImagePreview()` function:
- Handles both string URLs (legacy) and object format
- Properly displays image previews for both new and existing images

## How It Works

### Adding a New Animal with Images:
1. User selects image(s) via file picker or drag-and-drop
2. Images are previewed immediately (using data URLs)
3. When user clicks "Save", images are uploaded to server first
4. Server returns permanent URL (Cloudinary or data URL)
5. Animal data is saved with the image URL

### Editing an Existing Animal:
1. When opening edit modal, existing images are loaded and displayed
2. User can keep existing images or upload new ones
3. If new images are uploaded, they replace the old ones
4. If no new images, existing image URL is preserved
5. Animal data is updated with appropriate image URL

## Testing the Fix

### Test 1: Add New Animal with Image
1. Open admin dashboard at `/admin/`
2. Click "Add New Animal"
3. Fill in required fields (Name, Species, Status)
4. Upload an image by clicking the upload area or dragging a file
5. Verify image preview appears
6. Click "Save"
7. Verify success message appears
8. Verify animal appears in list with image

### Test 2: Edit Animal and Keep Image
1. Click "Edit" on an existing animal with an image
2. Verify the existing image appears in the preview
3. Change some text fields (e.g., description)
4. Click "Save" without uploading a new image
5. Verify animal is updated and image is preserved

### Test 3: Edit Animal and Replace Image
1. Click "Edit" on an existing animal
2. Remove existing image by clicking the X button
3. Upload a new image
4. Click "Save"
5. Verify animal is updated with new image

### Test 4: Add Animal with URL
1. Click "Add New Animal"
2. Fill in required fields
3. Instead of uploading, paste an image URL in the "Or enter image URL" field
4. Click "Save"
5. Verify animal is created with the URL image

## Cloudinary Configuration (Optional)

For permanent image storage, configure Cloudinary:

1. Create a Cloudinary account at https://cloudinary.com
2. Get your Cloud Name and create an Upload Preset
3. Add to `.env` file:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```
4. Restart the dev server

Without Cloudinary, images will be stored as data URLs (base64), which works but increases database size.

## API Endpoints

### POST `/api/admin/upload-image`
Uploads an image file and returns a URL.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `image`: File (required)
  - `section`: String (default: 'animals')
  - `orgId`: String (default: '3')

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://...",
  "filename": "image.jpg",
  "size": 123456,
  "type": "image/jpeg",
  "message": "Image uploaded successfully"
}
```

### PUT `/api/admin/animals`
Updates an existing animal (including image_url).

**Request:**
- Content-Type: `application/json`
- Body includes `image_url` field

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Requires FormData API support (all modern browsers)
- File API for drag-and-drop (all modern browsers)

## Known Limitations

1. Maximum 5 images per animal (only first is used currently)
2. 5MB file size limit per image
3. Data URL fallback increases payload size
4. No image compression (consider adding for production)

## Future Enhancements

- [ ] Support multiple images per animal
- [ ] Image compression before upload
- [ ] Image cropping/editing
- [ ] Progress bar for large uploads
- [ ] Retry logic for failed uploads
- [ ] Image optimization (WebP conversion)

