# Xano Database Schema for Dynamic Website Content

## 🎯 **Overview**
This schema maps all admin dashboard settings to front-end website content, making every aspect of the website dynamically editable through the Barkhaus admin dashboard.

## 📊 **Database Tables**

### **1. Organizations Table** (Enhanced)
```sql
organizations {
  id: integer (Primary Key)
  
  -- Basic Info
  name: text
  ein: text
  phone: text
  email: text
  description: text (long)
  address: text
  website_url: text
  
  -- Branding
  logo_url: text
  primary_color: text (#hex)
  secondary_color: text (#hex)
  accent_color: text (#hex)
  
  -- Social Media
  facebook_url: text
  instagram_url: text
  twitter_url: text
  youtube_url: text
  linkedin_url: text
  
  -- Email & Domain
  email_domain: text
  contact_email: text
  support_email: text
  
  -- Status
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### **2. Website_Content Table** (New)
```sql
website_content {
  id: integer (Primary Key)
  org_id: integer (Foreign Key → organizations.id)
  page_slug: text (e.g., 'homepage', 'about', 'contact')
  section_key: text (e.g., 'hero', 'services', 'about_us')
  
  -- Content Fields
  headline: text
  subheadline: text
  body_text: text (long)
  button_text: text
  button_link: text
  
  -- Images
  background_image_url: text
  featured_image_url: text
  secondary_image_url: text
  
  -- SEO
  meta_title: text
  meta_description: text
  
  -- Display Settings
  is_visible: boolean
  sort_order: integer
  
  created_at: timestamp
  updated_at: timestamp
}
```

### **3. Services Table** (New)
```sql
services {
  id: integer (Primary Key)
  org_id: integer (Foreign Key → organizations.id)
  
  title: text
  description: text
  icon_url: text
  image_url: text
  
  -- Links
  learn_more_url: text
  cta_text: text
  cta_url: text
  
  -- Display
  is_active: boolean
  sort_order: integer
  
  created_at: timestamp
  updated_at: timestamp
}
```

### **4. Portfolio_Items Table** (New)
```sql
portfolio_items {
  id: integer (Primary Key)
  org_id: integer (Foreign Key → organizations.id)
  
  title: text
  description: text
  image_url: text
  category: text
  
  -- Links
  project_url: text
  gallery_images: json (array of image URLs)
  
  -- Display
  is_featured: boolean
  sort_order: integer
  
  created_at: timestamp
  updated_at: timestamp
}
```

### **5. Testimonials Table** (New)
```sql
testimonials {
  id: integer (Primary Key)
  org_id: integer (Foreign Key → organizations.id)
  
  customer_name: text
  customer_title: text
  customer_image_url: text
  testimonial_text: text (long)
  rating: integer (1-5)
  
  -- Display
  is_featured: boolean
  sort_order: integer
  
  created_at: timestamp
  updated_at: timestamp
}
```

### **6. FAQ_Items Table** (New)
```sql
faq_items {
  id: integer (Primary Key)
  org_id: integer (Foreign Key → organizations.id)
  
  question: text
  answer: text (long)
  category: text
  
  -- Display
  is_active: boolean
  sort_order: integer
  
  created_at: timestamp
  updated_at: timestamp
}
```

### **7. Navigation_Items Table** (New)
```sql
navigation_items {
  id: integer (Primary Key)
  org_id: integer (Foreign Key → organizations.id)
  
  label: text
  url: text
  parent_id: integer (Self-referencing for dropdowns)
  
  -- Display
  is_active: boolean
  sort_order: integer
  location: text ('header', 'footer', 'mobile')
  
  created_at: timestamp
  updated_at: timestamp
}
```

## 🎨 **Content Mapping**

### **Homepage Sections:**

#### **1. Hero Section**
- **Table:** `website_content` where `page_slug='homepage'` and `section_key='hero'`
- **Fields:**
  - `headline` → "Every Dog Deserves a Loving Home"
  - `subheadline` → "Rescue • Love • Adopt"
  - `body_text` → Main description
  - `button_text` → "Meet Our Dogs"
  - `button_link` → "/our-animals/"
  - `background_image_url` → Hero background image

#### **2. Services Section**
- **Table:** `services` where `org_id=9`
- **Fields:**
  - `title` → "Service 1", "Service 2", "Service 3"
  - `description` → Service descriptions
  - `icon_url` → Service icons

#### **3. About Us Section**
- **Table:** `website_content` where `section_key='about_us'`
- **Fields:**
  - `headline` → "About Company Title"
  - `subheadline` → "About Us"
  - `body_text` → About description
  - `featured_image_url` → First image
  - `secondary_image_url` → Second image

#### **4. SEO Ranking Section**
- **Table:** `website_content` where `section_key='seo_content'`
- **Fields:**
  - `headline` → "Talk about a main service keyword"
  - `subheadline` → "SEO Ranking"
  - `body_text` → Content description

#### **5. Portfolio Section**
- **Table:** `portfolio_items` where `org_id=9`
- **Header:** `website_content` where `section_key='portfolio_header'`

#### **6. Reviews Section**
- **Table:** `testimonials` where `org_id=9`
- **Header:** `website_content` where `section_key='reviews_header'`

#### **7. FAQ Section**
- **Table:** `faq_items` where `org_id=9`

#### **8. CTA Section**
- **Table:** `website_content` where `section_key='cta'`
- **Fields:**
  - `headline` → "Get It Done With Us Today"
  - `body_text` → CTA description
  - `button_text` → "Get an Estimate Now"
  - `button_link` → "/contact"
  - `background_image_url` → CTA background

## 🔄 **Implementation Steps**

### **Step 1: Create Xano Tables**
1. Log into Xano dashboard
2. Create each table with the schema above
3. Set up relationships between tables
4. Add sample data for testing

### **Step 2: Create API Endpoints**
1. Create API endpoints for each table
2. Set up CRUD operations
3. Add organization filtering
4. Test endpoints with Postman

### **Step 3: Update Admin Dashboard**
1. Add content management sections
2. Create forms for each content type
3. Add image upload functionality
4. Implement real-time preview

### **Step 4: Update Frontend Code**
1. Create API calls to fetch content
2. Replace hardcoded content with dynamic data
3. Add fallback content for missing data
4. Test all sections

### **Step 5: Testing & Deployment**
1. Test content updates in admin
2. Verify changes appear on website
3. Test across all organizations
4. Deploy to production
```
