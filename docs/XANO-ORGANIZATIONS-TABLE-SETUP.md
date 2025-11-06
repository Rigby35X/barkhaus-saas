# Enhanced Organizations Table Setup

## 🎯 **Adding New Columns to Organizations Table**

### **Step-by-Step Instructions:**

1. **Go to Xano Dashboard** → Database → Find `organizations` table
2. **Click on the table** to open it
3. **Click "Add Field"** for each new column below
4. **Configure each field** with the exact settings shown

---

## 📋 **New Columns to Add:**

### **Branding & Visual Identity**
```
Column Name: logo_url
Type: Text
Required: No
Default: null
Description: URL to organization's logo image
```

```
Column Name: primary_color
Type: Text
Required: No
Default: #059669
Description: Main brand color (hex code)
```

```
Column Name: secondary_color
Type: Text
Required: No
Default: #047857
Description: Secondary brand color (hex code)
```

```
Column Name: accent_color
Type: Text
Required: No
Default: #6bb3eb
Description: Accent color for highlights (hex code)
```

### **Social Media Links**
```
Column Name: facebook_url
Type: Text
Required: No
Default: null
Description: Facebook page URL
```

```
Column Name: instagram_url
Type: Text
Required: No
Default: null
Description: Instagram profile URL
```

```
Column Name: twitter_url
Type: Text
Required: No
Default: null
Description: Twitter profile URL
```

```
Column Name: youtube_url
Type: Text
Required: No
Default: null
Description: YouTube channel URL
```

```
Column Name: linkedin_url
Type: Text
Required: No
Default: null
Description: LinkedIn page URL
```

### **Contact & Communication**
```
Column Name: contact_email
Type: Text
Required: No
Default: null
Description: Main contact email address
```

```
Column Name: support_email
Type: Text
Required: No
Default: null
Description: Support/help email address
```

```
Column Name: email_domain
Type: Text
Required: No
Default: null
Description: Organization's email domain (e.g., @mbpr.org)
```

### **Additional Info**
```
Column Name: ein
Type: Text
Required: No
Default: null
Description: Employer Identification Number (Tax ID)
```

```
Column Name: mission_statement
Type: Text
Required: No
Default: null
Description: Organization's mission statement
```

```
Column Name: founded_year
Type: Integer
Required: No
Default: null
Description: Year the organization was founded
```

---

## 🔧 **After Adding Columns:**

### **Step 3: Update Mission Bay Record (ID: 9)**

Once you've added all the columns, update the Mission Bay record with sample data:

```json
{
  "id": 9,
  "org": "mission bay puppy rescue",
  "slug": "mbpr",
  "email": "kristin@mbpr.org",
  "phone": "555 555-5555",
  "address": "1234 Bayside Walk, San Diego, CA 92109",
  
  // NEW FIELDS:
  "logo_url": "/assets/images/MBPR-White.png",
  "primary_color": "#6bb3eb",
  "secondary_color": "#047857",
  "accent_color": "#059669",
  
  "facebook_url": "https://facebook.com/missionbaypuppyrescue",
  "instagram_url": "https://instagram.com/mbpr_rescue",
  "twitter_url": "https://twitter.com/mbpr_rescue",
  "youtube_url": null,
  "linkedin_url": null,
  
  "contact_email": "info@mbpr.org",
  "support_email": "help@mbpr.org",
  "email_domain": "@mbpr.org",
  
  "ein": "12-3456789",
  "mission_statement": "Every dog deserves a loving home. We rescue, rehabilitate, and rehome dogs in need throughout the San Diego area.",
  "founded_year": 2020
}
```

---

## ✅ **Verification Steps:**

1. **Check the table structure** - All new columns should be visible
2. **Update Mission Bay record** - Add sample data to test
3. **Test API endpoint** - Verify data is accessible via API
4. **Check in admin dashboard** - Ensure data displays correctly

---

## 🔄 **Next Steps:**

After completing this table:
1. ✅ Enhanced Organizations table
2. 🔄 Create Website Content table
3. 🔄 Create Services table
4. 🔄 Create Testimonials table
5. 🔄 Create FAQ Items table

---

## 🆘 **Need Help?**

If you encounter any issues:
1. **Screenshot the error** and share it
2. **Check field types** match exactly as specified
3. **Verify required/optional** settings are correct
4. **Test with sample data** before proceeding

Ready to add these columns to your organizations table?
