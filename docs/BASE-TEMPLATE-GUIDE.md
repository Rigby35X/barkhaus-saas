# 🎯 Base Template Configuration Guide

## Overview

The `template.config.json` file is your **master template** that defines the complete structure and all available tokens for animal rescue websites. When you create new templates, you copy this base structure and fill in the specific values for each organization.

## 📁 Key Files

### 1. **`template.config.json`** - Master Base Template
- Contains ALL possible tokens and structure
- Defines the complete schema for animal rescue sites
- Use this as your starting point for new templates

### 2. **Example Templates** (in `examples/` folder)
- `animal-rescue.config.json` - General multi-species rescue
- `cat-sanctuary.config.json` - Cat-specific sanctuary
- `senior-pet-sanctuary.config.json` - Senior pet care

## 🏗️ Complete Page Structure

The base template now includes comprehensive sections for:

### **Core Pages**
- **Homepage** - Hero, services, about, gallery, reviews
- **About** - Story, mission, team members
- **Our Animals** - Animal listings with filtering
- **Animal Details** - Individual animal profiles
- **Applications** - Adoption, foster, volunteer forms
- **Donate** - Impact, levels, monthly giving, transparency
- **Events** - Event listings, newsletter signup
- **Contact** - Contact forms and information

### **Navigation & Footer**
- Up to 7 navigation items
- Footer with quick links, social media, newsletter
- SEO configuration

## 🎨 How to Create a New Template

### Step 1: Copy the Base Template
```bash
cp template.config.json examples/my-new-rescue.config.json
```

### Step 2: Replace ALL Tokens with Real Values

Instead of tokens like `{{orgName}}`, fill in actual values:

**Before (Base Template):**
```json
{
  "organization": {
    "name": "{{orgName}}",
    "email": "{{orgEmail}}"
  }
}
```

**After (Your Template):**
```json
{
  "organization": {
    "name": "Happy Tails Dog Rescue",
    "email": "info@happytailsrescue.org"
  }
}
```

### Step 3: Customize All Sections

Go through each section and replace tokens with your content:

#### **Site Information**
```json
{
  "site": {
    "name": "Happy Tails Dog Rescue",
    "title": "Saving Dogs, Finding Homes",
    "description": "Dedicated dog rescue serving the greater metro area",
    "domain": "happytailsrescue.org",
    "url": "https://happytailsrescue.org"
  }
}
```

#### **Organization Details**
```json
{
  "organization": {
    "name": "Happy Tails Dog Rescue",
    "legalName": "Happy Tails Dog Rescue Inc.",
    "email": "info@happytailsrescue.org",
    "phone": {
      "tel": "555-DOG-TAIL",
      "formatted": "(555) DOG-TAIL"
    },
    "address": {
      "lineOne": "123 Rescue Lane",
      "lineTwo": "Suite 100",
      "city": "Dog City",
      "state": "CA",
      "zip": "90210",
      "country": "United States"
    },
    "mission": "To rescue, rehabilitate, and rehome dogs in need while educating the community about responsible pet ownership."
  }
}
```

#### **Branding & Colors**
```json
{
  "branding": {
    "colors": {
      "primary": "#2E8B57",        // Sea Green for dogs
      "primaryLight": "#3CB371",   // Medium Sea Green
      "primaryDark": "#228B22",    // Forest Green
      "secondary": "#4682B4",      // Steel Blue
      "accent": "#F0F8FF"          // Alice Blue
    },
    "fonts": {
      "primary": "'Roboto', 'Arial', sans-serif",
      "headings": "'Roboto Slab', 'Georgia', serif"
    }
  }
}
```

#### **Homepage Content**
```json
{
  "homepage": {
    "hero": {
      "topper": "Dog Rescue & Adoption",
      "title": "Every Dog Deserves a Loving Home",
      "subtitle": "Find Your Perfect Companion",
      "description": "Happy Tails Dog Rescue has been saving lives and finding forever homes for dogs in need since 2010.",
      "primaryCTA": {
        "text": "Adopt a Dog",
        "link": "/our-animals"
      },
      "secondaryCTA": {
        "text": "Learn About Us",
        "link": "/about"
      }
    }
  }
}
```

#### **Navigation**
```json
{
  "navigation": {
    "items": [
      { "text": "Home", "link": "/" },
      { "text": "About", "link": "/about/" },
      { "text": "Our Dogs", "link": "/our-animals/" },
      { "text": "Applications", "link": "/applications/" },
      { "text": "Donate", "link": "/donate/" },
      { "text": "Events", "link": "/events/" },
      { "text": "Contact", "link": "/contact/" }
    ]
  }
}
```

## 🎯 Token Categories

### **Required Tokens** (Must be filled)
- All `{{orgName}}`, `{{orgEmail}}`, etc. - Organization basics
- All `{{colorPrimary}}`, `{{fontPrimary}}`, etc. - Branding
- All `{{heroTitle}}`, `{{heroDescription}}`, etc. - Homepage content
- All navigation and footer tokens

### **Optional Tokens** (Can be empty or removed)
- Team member details (if no team page)
- Some gallery images (minimum 4 recommended)
- Additional service items
- Extra testimonials

### **Page-Specific Tokens**
- **About Page**: Story, mission, team information
- **Donate Page**: Impact stats, donation levels, transparency
- **Events Page**: Newsletter signup, event descriptions
- **Applications**: Requirements, processes, benefits

## 🚀 Generate Your Site

Once your template is complete:

```bash
# Generate using your new template
node scripts/process-template.js examples/my-new-rescue.config.json ./my-rescue-site

# Or use the interactive generator
npm run generate-site
```

## 📝 Template Validation

### Check Your Template:
1. **No remaining `{{tokens}}`** - All should be replaced with real values
2. **Valid JSON** - Use a JSON validator to check syntax
3. **Complete sections** - Don't leave empty required fields
4. **Consistent branding** - Colors and fonts match throughout
5. **Working links** - All navigation and button links are valid

### Common Mistakes:
- ❌ Leaving `{{tokens}}` unreplaced
- ❌ Invalid JSON syntax (missing commas, quotes)
- ❌ Empty required fields like organization name
- ❌ Broken internal links in navigation
- ❌ Inconsistent color schemes

## 🎨 Customization Tips

### **Color Schemes by Rescue Type:**
- **Dog Rescues**: Warm colors (oranges, browns, greens)
- **Cat Sanctuaries**: Cool colors (purples, blues, grays)
- **Senior Pet Care**: Dignified colors (deep purples, golds)
- **Multi-Species**: Balanced colors (teals, oranges)

### **Font Combinations:**
- **Modern**: Nunito + Open Sans
- **Classic**: Merriweather + Source Sans Pro
- **Friendly**: Roboto + Roboto Slab
- **Elegant**: Playfair Display + Lato

### **Content Guidelines:**
- **Hero sections**: Emotional, action-oriented
- **About sections**: Story-driven, mission-focused
- **Service descriptions**: Benefit-focused, clear
- **Testimonials**: Authentic, specific, emotional

## 📊 Template Examples

### Quick Reference:
```bash
# General animal rescue
examples/animal-rescue.config.json

# Cat-specific sanctuary  
examples/cat-sanctuary.config.json

# Senior pet sanctuary
examples/senior-pet-sanctuary.config.json
```

Each example shows how to fill out the base template for different types of rescues.

## 🔄 Updating the Base Template

When you want to add new features to ALL templates:

1. **Update `template.config.json`** with new token structure
2. **Update the processing scripts** to handle new tokens
3. **Update existing example templates** to include new sections
4. **Test with template generation** to ensure everything works

---

**🎉 You're Ready!** Use the base template to create unlimited customized animal rescue websites. Each one will have the same professional structure but unique branding and content.
