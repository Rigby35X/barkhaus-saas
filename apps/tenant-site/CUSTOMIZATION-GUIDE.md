# Mission Bay Puppy Rescue - Website Customization Guide

This guide explains where to find and edit different parts of your website.

## 📁 File Structure Overview

```
mission-bay-site/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Header.astro     # Navigation header
│   │   ├── Footer.astro     # Site footer
│   │   └── ...
│   ├── layouts/             # Page templates
│   │   └── Layout.astro     # Main page layout
│   ├── pages/               # Website pages
│   │   ├── index.astro      # Homepage
│   │   ├── about.astro      # About page
│   │   └── ...
│   ├── data/                # Site data files
│   │   └── navData.json     # Navigation menu items
│   └── styles/              # CSS stylesheets
├── public/                  # Static files (images, etc.)
│   └── assets/
│       └── images/          # Website images
└── admin/                   # CMS admin interface
```

## 🎨 Common Customizations

### 1. Header/Navigation Changes
**File:** `src/components/Header.astro`

**What you can change:**
- Logo: Update the `<img src="">` path (line ~23)
- Navigation menu items: Edit `src/data/navData.json`
- Header colors: Look for `background-color` in the `<style>` section
- Font colors: Look for `color:` properties in navigation styles
- Mobile menu styling

**Example locations:**
- Header background: Lines ~129, ~276, ~697
- Nav text color: Lines ~347, ~765
- Logo image: Line ~23

### 2. Navigation Menu Items
**File:** `src/data/navData.json`

Add/remove/edit menu items:
```json
[
  {
    "key": "Home",
    "url": "/",
    "children": []
  },
  {
    "key": "About",
    "url": "/about/",
    "children": []
  }
]
```

### 3. Footer Changes
**File:** `src/components/Footer.astro`

**What you can change:**
- Contact information
- Social media links
- Footer text and links
- Footer colors and styling

### 4. Homepage Content
**File:** `src/pages/index.astro`

**What you can change:**
- Hero section text and images
- Main content sections
- Call-to-action buttons

### 5. About Page
**File:** `src/pages/about.astro`

**What you can change:**
- Mission statement
- Team information
- Organization history

### 6. Global Styles
**File:** `src/layouts/Layout.astro`

**What you can change:**
- Site-wide fonts
- Global CSS variables
- Meta tags and SEO information

### 7. Images
**Directory:** `public/assets/images/`

**How to add images:**
1. Place image files in `public/assets/images/`
2. Reference them in code as `/assets/images/filename.jpg`

**Common image locations:**
- Logo: `public/assets/images/MBPR-White.png`
- Hero images: Usually in the same directory
- Gallery/portfolio images: `public/assets/images/portfolio/`

## 🎯 Quick Reference for Common Tasks

### Change Logo
1. Add new logo to `public/assets/images/`
2. Edit `src/components/Header.astro` line ~23
3. Update the `src` attribute: `src="/assets/images/your-logo.png"`

### Change Header Colors
1. Open `src/components/Header.astro`
2. Find the `<style>` section (starts around line 108)
3. Look for `background-color` properties
4. Change hex color codes (e.g., `#6bb3eb`)

### Add New Page
1. Create new file in `src/pages/` (e.g., `services.astro`)
2. Add page to navigation in `src/data/navData.json`
3. Use existing pages as templates

### Change Contact Information
1. Edit `src/components/Footer.astro` for footer contact info
2. Edit contact page at `src/pages/contact.astro`

### Update Site Colors
1. Global colors: `src/layouts/Layout.astro` (CSS variables)
2. Component-specific: Individual component files

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 Content Management

Your site uses Decap CMS for content management:
- Access admin at: `yoursite.com/admin`
- Edit content through the web interface
- Changes are saved to your repository

## 🎨 Color Scheme Reference

Current brand colors:
- Primary Blue: `#6bb3eb`
- White: `#fff`
- Dark text: `#1a1a1a`

## 📞 Need Help?

When asking for help, please specify:
1. What you want to change
2. Which page/section it's on
3. Include the file path if you know it

This will help get faster, more accurate assistance!
