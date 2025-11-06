# Multi-Tenant Xano Usage Examples

This document shows how to use the multi-tenant Xano integration for multiple animal rescue organizations.

## 🏢 Organization Setup

### Example Organizations in Xano:

```json
// Organization 1: Happy Paws Dog Rescue
{
  "id": "happy-paws-rescue",
  "name": "Happy Paws Dog Rescue",
  "email": "info@happypawsrescue.org",
  "phone": "(555) DOG-PAWS",
  "address": "123 Rescue Lane, Dog City, CA 90210",
  "website": "https://happypawsrescue.org",
  "description": "Dedicated to finding loving homes for dogs in need",
  "logo": "https://your-cdn.com/logos/happy-paws-logo.png",
  "primary_color": "#2E8B57",
  "secondary_color": "#1a5f3f"
}

// Organization 2: Whiskers Cat Sanctuary
{
  "id": "whiskers-sanctuary",
  "name": "Whiskers Cat Sanctuary",
  "email": "hello@whiskerssanctuary.org",
  "phone": "(555) CAT-MEOW",
  "address": "456 Feline Ave, Cat Town, CA 90211",
  "website": "https://whiskerssanctuary.org",
  "description": "A safe haven for cats of all ages",
  "logo": "https://your-cdn.com/logos/whiskers-logo.png",
  "primary_color": "#9B59B6",
  "secondary_color": "#7D3C98"
}
```

## 🐕 Animal Data Examples

### Animals for Happy Paws Dog Rescue:

```json
[
  {
    "id": 1,
    "org_id": "happy-paws-rescue",
    "name": "Luna",
    "type": "Dog",
    "breed": "Golden Retriever Mix",
    "age": "3 years",
    "gender": "Female",
    "size": "Large",
    "weight": "65 lbs",
    "status": "Available",
    "description": "Luna is a sweet and gentle girl who loves playing fetch.",
    "primary_image": "https://your-cdn.com/animals/luna-main.jpg",
    "images": [
      "https://your-cdn.com/animals/luna-1.jpg",
      "https://your-cdn.com/animals/luna-2.jpg",
      "https://your-cdn.com/animals/luna-3.jpg"
    ],
    "good_with_kids": true,
    "good_with_cats": true,
    "good_with_dogs": true,
    "spayed_neutered": true,
    "vaccinated": true,
    "microchipped": true,
    "adoption_fee": 250
  }
]
```

### Animals for Whiskers Cat Sanctuary:

```json
[
  {
    "id": 1,
    "org_id": "whiskers-sanctuary",
    "name": "Mittens",
    "type": "Cat",
    "breed": "Domestic Shorthair",
    "age": "2 years",
    "gender": "Female",
    "size": "Medium",
    "weight": "10 lbs",
    "status": "Available",
    "description": "Mittens is a playful cat who loves sunny windowsills.",
    "primary_image": "https://your-cdn.com/animals/mittens-main.jpg",
    "images": [
      "https://your-cdn.com/animals/mittens-1.jpg",
      "https://your-cdn.com/animals/mittens-2.jpg"
    ],
    "good_with_kids": true,
    "good_with_cats": true,
    "good_with_dogs": false,
    "spayed_neutered": true,
    "vaccinated": true,
    "microchipped": true,
    "adoption_fee": 150
  }
]
```

## 🚀 Generating Sites for Different Organizations

### Generate Happy Paws Dog Rescue Site:
```bash
node scripts/generate-org-site.js happy-paws-rescue happy-paws-site
cd happy-paws-site
npm install
npm run dev
```

### Generate Whiskers Cat Sanctuary Site:
```bash
node scripts/generate-org-site.js whiskers-sanctuary whiskers-site
cd whiskers-site
npm install
npm run dev
```

## 🔧 API Endpoint Examples

### Get all animals for Happy Paws:
```
GET /orgs/happy-paws-rescue/animals
```

### Get specific animal for Whiskers Sanctuary:
```
GET /orgs/whiskers-sanctuary/animals/1
```

### Get organization info:
```
GET /orgs/happy-paws-rescue
GET /orgs/whiskers-sanctuary
```

## 🎨 Customization Per Organization

Each generated site will automatically:

1. **Use organization-specific data** from Xano
2. **Apply organization branding** (colors, logo, name)
3. **Show only that organization's animals**
4. **Display organization contact information**
5. **Maintain separate animal databases**

## 🔄 Switching Organizations (Development)

To test different organizations in the same codebase:

```javascript
// In your development environment
import { setOrganizationId } from './src/lib/xano.js';

// Switch to different organization
setOrganizationId('whiskers-sanctuary');
```

Or update your `.env` file:
```env
PUBLIC_ORG_ID=whiskers-sanctuary
```

## 🌐 Production Deployment

For production, each organization gets their own:

1. **Subdomain**: `happy-paws.yourplatform.com`, `whiskers.yourplatform.com`
2. **Environment variables**: Organization-specific `.env` files
3. **Deployment**: Separate Vercel/Netlify deployments
4. **Database**: Same Xano workspace, filtered by `org_id`

This multi-tenant approach allows you to:
- ✅ **Manage multiple rescues** from one Xano workspace
- ✅ **Keep data separate** between organizations
- ✅ **Share common functionality** across all sites
- ✅ **Scale efficiently** as you add more rescue organizations
- ✅ **Maintain consistent branding** per organization
