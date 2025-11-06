# Dynamic Content Implementation Guide

## 🎯 **Phase 1: Create Xano Tables**

### **Step 1: Access Xano Dashboard**
1. Go to your Xano workspace: `https://xz6u-fpaz-praf.n7e.xano.io`
2. Navigate to **Database** section
3. Create the following tables:

### **Step 2: Create Tables in Order**

#### **A. Enhanced Organizations Table**
```sql
-- Add these new columns to existing organizations table:
ALTER TABLE organizations ADD COLUMN:
- logo_url: text
- primary_color: text (default: '#059669')
- secondary_color: text (default: '#047857')
- accent_color: text (default: '#6bb3eb')
- facebook_url: text
- instagram_url: text
- twitter_url: text
- youtube_url: text
- linkedin_url: text
- email_domain: text
- contact_email: text
- support_email: text
```

#### **B. Website Content Table**
```sql
CREATE TABLE website_content:
- id: integer (auto-increment, primary key)
- org_id: integer (foreign key to organizations)
- page_slug: text (required)
- section_key: text (required)
- headline: text
- subheadline: text
- body_text: text
- button_text: text
- button_link: text
- background_image_url: text
- featured_image_url: text
- secondary_image_url: text
- meta_title: text
- meta_description: text
- is_visible: boolean (default: true)
- sort_order: integer (default: 0)
- created_at: timestamp (auto)
- updated_at: timestamp (auto)
```

#### **C. Services Table**
```sql
CREATE TABLE services:
- id: integer (auto-increment, primary key)
- org_id: integer (foreign key to organizations)
- title: text (required)
- description: text
- icon_url: text
- image_url: text
- learn_more_url: text
- cta_text: text
- cta_url: text
- is_active: boolean (default: true)
- sort_order: integer (default: 0)
- created_at: timestamp (auto)
- updated_at: timestamp (auto)
```

#### **D. Testimonials Table**
```sql
CREATE TABLE testimonials:
- id: integer (auto-increment, primary key)
- org_id: integer (foreign key to organizations)
- customer_name: text (required)
- customer_title: text
- customer_image_url: text
- testimonial_text: text (required)
- rating: integer (1-5, default: 5)
- is_featured: boolean (default: false)
- sort_order: integer (default: 0)
- created_at: timestamp (auto)
- updated_at: timestamp (auto)
```

#### **E. FAQ Items Table**
```sql
CREATE TABLE faq_items:
- id: integer (auto-increment, primary key)
- org_id: integer (foreign key to organizations)
- question: text (required)
- answer: text (required)
- category: text
- is_active: boolean (default: true)
- sort_order: integer (default: 0)
- created_at: timestamp (auto)
- updated_at: timestamp (auto)
```

## 🔌 **Phase 2: Create API Endpoints**

### **Step 1: Website Content API**
Create endpoint: `/api/website-content/{org_id}`

**GET Request:**
```javascript
// Returns all content for an organization
GET /api/website-content/9
Response: {
  "homepage": {
    "hero": {
      "headline": "Every Dog Deserves a Loving Home",
      "subheadline": "Rescue • Love • Adopt",
      "body_text": "At Mission Bay Puppy Rescue...",
      "button_text": "Meet Our Dogs",
      "button_link": "/our-animals/",
      "background_image_url": "/assets/images/hero.jpg"
    },
    "about_us": { ... },
    "cta": { ... }
  }
}
```

### **Step 2: Services API**
Create endpoint: `/api/services/{org_id}`

### **Step 3: Testimonials API**
Create endpoint: `/api/testimonials/{org_id}`

### **Step 4: FAQ API**
Create endpoint: `/api/faq/{org_id}`

## 🎨 **Phase 3: Update Frontend Code**

### **Step 1: Create Content Fetching Function**
```javascript
// src/utils/contentApi.js
export async function fetchWebsiteContent(orgId, pageSlug = 'homepage') {
  try {
    const response = await fetch(`/api/website-content?orgId=${orgId}&page=${pageSlug}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching content:', error);
  }
  return null;
}

export async function fetchServices(orgId) {
  try {
    const response = await fetch(`/api/services?orgId=${orgId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching services:', error);
  }
  return [];
}
```

### **Step 2: Update Homepage (index.astro)**
```astro
---
import { fetchWebsiteContent, fetchServices } from '@utils/contentApi.js';

// Fetch dynamic content
const orgId = 9; // Mission Bay
const content = await fetchWebsiteContent(orgId, 'homepage');
const services = await fetchServices(orgId);

// Fallback content if API fails
const defaultContent = {
  hero: {
    headline: "Every Dog Deserves a Loving Home",
    subheadline: "Rescue • Love • Adopt",
    // ... fallback data
  }
};

const pageContent = content || defaultContent;
---

<BaseLayout
  title={pageContent.hero.meta_title || "Mission Bay Puppy Rescue"}
  description={pageContent.hero.meta_description || "Default description"}
>
  <!-- Hero Section -->
  <section id="hero">
    <div class="cs-container">
      <div class="cs-flex-group">
        <span class="cs-topper">{pageContent.hero.subheadline}</span>
        <h1 class="cs-title">{pageContent.hero.headline}</h1>
        <p class="cs-text">{pageContent.hero.body_text}</p>
        <a href={pageContent.hero.button_link} class="cs-button-solid">
          {pageContent.hero.button_text}
        </a>
      </div>
    </div>
    
    <!-- Dynamic Background Image -->
    <picture class="cs-picture">
      <img src={pageContent.hero.background_image_url} alt="hero background" />
    </picture>
  </section>

  <!-- Services Section -->
  <section id="services" class="services">
    {services.map((service) => (
      <div class="card">
        <picture>
          <img src={service.icon_url} alt={service.title} width="48" height="48" />
        </picture>
        <h2>{service.title}</h2>
        <p>{service.description}</p>
      </div>
    ))}
  </section>
</BaseLayout>
```

## 🛠️ **Phase 4: Update Admin Dashboard**

### **Step 1: Add Content Management Sections**
Update the admin dashboard HTML to include:

1. **Website Content Manager**
   - Hero section editor
   - About section editor
   - CTA section editor

2. **Services Manager**
   - Add/edit/delete services
   - Upload service icons
   - Reorder services

3. **Testimonials Manager**
   - Customer review management
   - Photo uploads
   - Featured testimonials

4. **FAQ Manager**
   - Question/answer pairs
   - Categories
   - Reordering

### **Step 2: Create Admin Forms**
```html
<!-- Website Content Form -->
<div id="content-manager" class="admin-section">
  <h3>Website Content</h3>
  
  <!-- Hero Section -->
  <div class="content-section">
    <h4>Hero Section</h4>
    <input type="text" id="hero-headline" placeholder="Main Headline">
    <input type="text" id="hero-subheadline" placeholder="Subheadline">
    <textarea id="hero-body" placeholder="Body Text"></textarea>
    <input type="text" id="hero-button-text" placeholder="Button Text">
    <input type="text" id="hero-button-link" placeholder="Button Link">
    <input type="file" id="hero-background" accept="image/*">
  </div>
</div>
```

## 🚀 **Implementation Timeline**

### **Week 1: Database Setup**
- [ ] Create Xano tables
- [ ] Set up relationships
- [ ] Add sample data
- [ ] Test API endpoints

### **Week 2: Frontend Integration**
- [ ] Create API utility functions
- [ ] Update homepage with dynamic content
- [ ] Add fallback content
- [ ] Test content loading

### **Week 3: Admin Dashboard**
- [ ] Add content management forms
- [ ] Implement CRUD operations
- [ ] Add image upload functionality
- [ ] Test admin functionality

### **Week 4: Testing & Polish**
- [ ] Test all content types
- [ ] Verify real-time updates
- [ ] Cross-browser testing
- [ ] Performance optimization

Would you like me to start with Phase 1 and help you create the Xano tables?
