# Admin Dashboard - Quick Start

## TL;DR - What Was Broken & How It's Fixed

### ❌ Problems
1. No UI for editing website content sections
2. API sent duplicate data to Xano (data was both inside `content` object AND spread at top level)
3. No error handling for malformed requests

### ✅ Solutions
1. Created new admin content editor: `/admin-content-editor`
2. Fixed API to properly serialize content as JSON
3. Added request validation and error handling

---

## Access the Editor

```
http://localhost:4321/admin-content-editor  (development)
https://your-site.vercel.app/admin-content-editor  (production)
```

---

## Quick Edit Example

### Edit Homepage Hero

1. Open `/admin-content-editor`
2. Org ID: `9` (default)
3. Page: `Homepage`
4. Section: `Hero Section`
5. Change fields:
   - Headline: "Welcome!"
   - Button Text: "Get Started"
   - Button Link: "/about"
6. Click "Save Changes"
7. ✅ Done! Changes appear on site

---

## What Changed in the Code

### File: `website-content.js`

**Line 539-542 (FIXED)**
```javascript
// Before (broken):
const updateData = {
    content,
    ...content,  // ❌ Duplicate data!
    updated_at: new Date().toISOString()
};

// After (fixed):
const updateData = {
    content: typeof content === 'string' ? content : JSON.stringify(content),
    updated_at: new Date().toISOString()
};
```

**Lines 479-521 (IMPROVED)**
- Added validation for empty request body
- Added try-catch for JSON parsing
- Added required field validation
- Added detailed error messages

### File: `admin-content-editor.astro` (NEW)
- New admin UI for editing sections
- Real-time preview
- Save/reset functionality
- Works on all pages and sections

---

## Common Tasks

### Save a Section
```javascript
fetch('/api/website-content', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgId: '9',
    pageSlug: 'homepage',
    sectionKey: 'hero',
    content: {
      headline: 'New Headline',
      body_text: 'New content'
    }
  })
})
```

### Get All Content for a Page
```javascript
fetch('/api/website-content?orgId=9&page=homepage')
  .then(r => r.json())
  .then(data => console.log(data))
```

### Display in Template
```astro
---
import { fetchAllPageData } from '@utils/content-fetcher.js';
const { content } = await fetchAllPageData('homepage', '9', import.meta.env.SITE);
const hero = content.hero;
---

<h1>{hero.headline}</h1>
<p>{hero.body_text}</p>
<button>{hero.button_text}</button>
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Changes not saving | Check browser console (F12) for errors |
| "Request body is empty" | Ensure orgId and sectionKey are provided |
| "Invalid JSON" | Check that content fields don't contain unescaped quotes |
| Xano errors | Verify VITE_XANO_CONTENT_TOKEN in .env is correct |
| Changes not appearing | Clear browser cache (Ctrl+Shift+Delete) |

---

## Files Modified

- ✏️ `src/pages/api/website-content.js` - Fixed PUT method
- ✨ `src/pages/admin-content-editor.astro` - NEW admin UI
- 📖 `ADMIN_CONTENT_EDITOR.md` - Detailed documentation

---

## Next Steps

1. Test the editor: visit `/admin-content-editor`
2. Try editing a section
3. Verify changes appear on the live site
4. Read `ADMIN_CONTENT_EDITOR.md` for advanced usage
5. Update deployment environment variables if needed

---

**Status:** ✅ Ready to Use
**Last Updated:** November 3, 2024
