# Content Save Debugging Guide

## 🔍 **Issue:** Content edits not persisting on production sites

### **Affected URLs:**
- `https://mbpr.barkhaus.io/admin/barkhaus-admin.html` ✅ Loads correct org 9 admin
- `https://mbpups.barkhaus.io/admin/barkhaus-admin.html` ✅ Loads correct org 9 admin
- **Problem:** Content edits don't persist after saving

---

## 📋 **Debugging Steps**

### **Step 1: Open Browser Console**
1. Go to `https://mbpr.barkhaus.io/admin/barkhaus-admin.html`
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to the **Console** tab

### **Step 2: Make a Test Edit**
1. Click on any section to edit (e.g., Hero section)
2. Change some text
3. Click "Save"
4. **Watch the console for these logs:**

```
🎨 Updating website content for org 9, section hero, page homepage
📝 Content being saved: {headline: "...", body_text: "..."}
✅ Content updated successfully in Xano: {...}
🔄 Updated local cache with saved content
🔄 Reloading content from API to verify persistence...
✅ Verified content from API: {...}
```

### **Step 3: Check Network Tab**
1. Go to **Network** tab in DevTools
2. Filter by "website-content"
3. Look for the PUT request
4. Click on it and check:
   - **Request Payload:** Should show your content
   - **Response:** Should show `{success: true, message: "Content updated successfully..."}`
   - **Status Code:** Should be `200 OK`

### **Step 4: Check Xano Directly**
1. Go to your Xano dashboard
2. Navigate to the `website_content` table
3. Filter by `org_id = 9`
4. Check if the record was updated with your changes
5. Look at the `updated_at` timestamp - it should be recent

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: API Returns 500 Error**
**Symptom:** Console shows error message, Network tab shows 500 status
**Cause:** Xano endpoint might be down or misconfigured
**Solution:** Check Xano API endpoint configuration

### **Issue 2: API Returns 200 but Changes Don't Persist**
**Symptom:** Console shows success, but refreshing the page shows old content
**Cause:** Xano PATCH endpoint might not be saving correctly
**Solution:** Check the Xano endpoint logic - it should use PATCH method to update records

### **Issue 3: Changes Save but Don't Show on Public Site**
**Symptom:** Admin shows updated content, but public site shows old content
**Cause:** Caching issue - Vercel or browser cache
**Solution:** 
- Hard refresh the public site (Cmd+Shift+R or Ctrl+Shift+R)
- Wait 5 minutes for Vercel cache to expire
- Check the `Cache-Control` header in the API response

### **Issue 4: Wrong Org ID**
**Symptom:** Content saves but to wrong organization
**Cause:** `currentOrgId` variable not set correctly
**Solution:** Check the login flow - make sure `currentOrgId` is set after login

---

## 🔧 **Manual Test via Console**

Paste this into the browser console to test the API directly:

```javascript
// Test saving content
async function testSave() {
    const testData = {
        orgId: '9',
        sectionKey: 'hero',
        pageSlug: 'homepage',
        content: {
            headline: 'TEST HEADLINE ' + new Date().toISOString(),
            body_text: 'Test body text',
            button_text: 'Test Button'
        }
    };
    
    console.log('🧪 Testing save with data:', testData);
    
    const response = await fetch('/api/website-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('📊 Response:', result);
    
    if (response.ok) {
        console.log('✅ Save successful!');
        
        // Verify by fetching
        const verifyResponse = await fetch('/api/website-content?orgId=9&page=homepage');
        const verifiedContent = await verifyResponse.json();
        console.log('🔍 Verified content:', verifiedContent.hero);
    } else {
        console.error('❌ Save failed:', result);
    }
}

testSave();
```

---

## 📝 **Expected API Behavior**

### **PUT Request to `/api/website-content`**
**Request:**
```json
{
  "orgId": "9",
  "sectionKey": "hero",
  "pageSlug": "homepage",
  "content": {
    "headline": "New Headline",
    "body_text": "New body text",
    "button_text": "New button"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Content updated successfully and saved to database!",
  "data": {
    "id": 123,
    "org_id": 9,
    "section_key": "hero",
    "page_slug": "homepage",
    "headline": "New Headline",
    "body_text": "New body text",
    "button_text": "New button",
    "updated_at": "2025-11-12T19:50:00.000Z"
  }
}
```

### **GET Request to `/api/website-content?orgId=9&page=homepage`**
**Response:**
```json
{
  "hero": {
    "id": 123,
    "section_key": "hero",
    "page_slug": "homepage",
    "headline": "New Headline",
    "body_text": "New body text",
    "button_text": "New button",
    "content": { ... }
  },
  "services_header": { ... },
  "footer": { ... }
}
```

---

## 🎯 **Next Steps**

1. **Run the manual test** in the browser console
2. **Check the console logs** for any errors
3. **Check the Network tab** for the API request/response
4. **Report back** with:
   - Console logs
   - Network tab screenshot
   - Whether the test save worked
   - What you see in Xano

This will help identify exactly where the issue is!

