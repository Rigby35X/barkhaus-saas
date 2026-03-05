# Admin Content Editor - Setup & Usage Guide

## Overview

Your admin dashboard had issues saving website content changes because there was no UI for editing content sections and the API endpoint had bugs. This guide explains what was fixed and how to use the new admin content editor.

## What Was Fixed

### Issue 1: Missing Content Editor UI
**Problem:** The original `admin.astro` only loaded Decap CMS for blog posts. There was no interface for editing homepage sections (hero, FAQ, footer, etc.).

**Solution:** Created a new admin content editor at `/admin-content-editor` with:
- Section selection (hero, about us, FAQ, etc.)
- Page selection (homepage, about, contact, etc.)
- Real-time preview
- Save/reset functionality

### Issue 2: API Data Format Mismatch
**Problem:** The `website-content.js` PUT endpoint was spreading content fields at both the top level and nested under `content`, causing Xano to receive conflicting data.

**Old code (broken):**
```javascript
const updateData = {
    content,
    ...content,  // ❌ This spreads content fields at top level
    updated_at: new Date().toISOString()
};
```

**New code (fixed):**
```javascript
const updateData = {
    content: typeof content === 'string' ? content : JSON.stringify(content),
    updated_at: new Date().toISOString()
};
```

**Why this matters:** Xano expects content to be properly serialized as JSON. The fix ensures all content is stored in the `content` field as a JSON string.

### Issue 3: Missing Request Validation
**Problem:** The API didn't validate required fields or handle JSON parsing errors gracefully.

**Solution:** Added:
- Empty request body validation
- JSON parsing error handling
- Required field validation (orgId, sectionKey)
- Detailed error messages

## How to Use the New Admin Content Editor

### Accessing the Editor

1. **Development:** `http://localhost:4321/admin-content-editor`
2. **Production:** `https://your-site.vercel.app/admin-content-editor`

### Using the Editor

1. **Select Organization ID** - Usually `9` for Mission Bay Puppy Rescue (default)

2. **Select Page** - Choose which page the content belongs to:
   - Homepage
   - About
   - Contact
   - Our Animals
   - Donate
   - Events

3. **Select Section** - Choose the section to edit:
   - Hero Section (large top section with image)
   - About Us
   - Services
   - What We Do
   - Success Stories
   - Reviews
   - FAQ (Frequently Asked Questions)
   - Call to Action (CTA)
   - Footer (appears on all pages)

4. **Edit Fields** - Modify the content:
   - **Headline** - Main heading (required for most sections)
   - **Subheadline** - Secondary heading
   - **Body Text** - Main paragraph content
   - **Button Text** - Text for call-to-action button
   - **Button Link** - URL the button links to (e.g., `/about`, `/our-animals`)
   - **Image URL** - Path to background/featured image (e.g., `/assets/images/hero.jpg`)

5. **Preview** - See live preview on the right side as you type

6. **Save** - Click "Save Changes" to publish updates to Xano

### Example: Editing the Homepage Hero Section

1. Keep Organization ID as `9`
2. Select Page: `Homepage`
3. Select Section: `Hero Section`
4. Edit the fields:
   - Headline: "Welcome to Our Rescue"
   - Subheadline: "Finding loving homes for dogs"
   - Body Text: "Every dog deserves a second chance..."
   - Button Text: "Meet Our Dogs"
   - Button Link: "/our-animals"
   - Image URL: "/assets/images/hero.jpg"
5. Click "Save Changes"

The changes will appear on your website within seconds.

## Data Flow

```
Admin Editor Form
        ↓
  PUT /api/website-content
        ↓
  website-content.js validates & serializes
        ↓
  Xano backend updates record
        ↓
  Website re-fetches content
        ↓
  Changes appear on live site
```

## API Endpoint Details

### GET - Fetch Content
```bash
GET /api/website-content?orgId=9&page=homepage
```

Returns all sections for a page:
```json
{
  "hero": {
    "headline": "...",
    "subheadline": "...",
    "body_text": "...",
    "button_text": "...",
    "button_link": "...",
    "background_image_url": "..."
  },
  "about_us": { ... },
  "footer": { ... }
}
```

### PUT - Update Content
```bash
PUT /api/website-content
Content-Type: application/json

{
  "orgId": "9",
  "pageSlug": "homepage",
  "sectionKey": "hero",
  "content": {
    "headline": "New Headline",
    "subheadline": "New Subheadline",
    "body_text": "New body text",
    "button_text": "New Button",
    "button_link": "/new-page",
    "background_image_url": "/assets/images/new-hero.jpg"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Content updated successfully and saved to database!",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

## Troubleshooting

### Changes Not Saving?

1. **Check the browser console** - Look for error messages (F12 → Console tab)

2. **Check Xano token** - Verify the token in `website-content.js` is correct:
   ```javascript
   const XANO_CONFIG = {
       contentUrl: import.meta.env.VITE_XANO_CONTENT_URL,
       token: import.meta.env.VITE_XANO_CONTENT_TOKEN
   };
   ```

3. **Check environment variables** - Ensure `.env` has:
   ```
   VITE_XANO_CONTENT_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:MU8UozDK
   VITE_XANO_CONTENT_TOKEN=165XkoniNXylFdNKgO_aCvmAIcQ
   ```

4. **Check section exists** - The section must already exist in Xano. If it doesn't, the API will create it.

### Images Not Showing?

1. Ensure image paths use forward slashes: `/assets/images/hero.jpg`
2. Images should be uploaded to `public/assets/images/`
3. Use relative paths starting with `/`

### Content Not Appearing on Website?

1. The website uses content fetcher caching - changes may take 5 minutes to appear
2. Try clearing browser cache (Ctrl+Shift+Delete)
3. Check the network tab to see if `/api/website-content` is being called

## Integration with Existing Systems

### Decap CMS (Blog)
The blog editor at `/admin` still works separately for blog posts. The content editor handles page sections only.

### Content Fetcher
The `src/utils/content-fetcher.js` utility fetches content from the API. Your pages use this to display sections:

```javascript
const content = await fetchPageContent('homepage', '9', import.meta.env.SITE);
```

This fetches from `/api/website-content?orgId=9&page=homepage`.

## Advanced: Adding New Sections

To add a new editable section:

1. **Add to your page template** - Use the fetcher in your `.astro` page:
   ```astro
   ---
   const { content } = await fetchAllPageData('homepage', '9', import.meta.env.SITE);
   const myNewSection = content.my_new_section;
   ---

   <section>
     <h1>{myNewSection.headline}</h1>
     <p>{myNewSection.body_text}</p>
   </section>
   ```

2. **Add option to editor** - Edit `admin-content-editor.astro` and add to the `<select id="sectionKey">`:
   ```html
   <option value="my_new_section">My New Section</option>
   ```

3. **Create in Xano** - Use the editor to add data, or create a record manually:
   - org_id: 9
   - section_key: my_new_section
   - page_slug: homepage
   - content: `{"headline": "...", "body_text": "..."}`

## Support

For issues:
1. Check the browser console for error messages
2. Check Vercel/host logs for API errors
3. Verify Xano credentials are correct
4. Ensure JSON is valid when saving

---

**Last Updated:** November 2024
**Version:** 1.0
