# PAWS System - Quick Start Guide

## What Was Built

A comprehensive puppy management system **integrated into the Animals tab** for **Org 9 (Mission Bay Puppy Rescue)** with:

- **218 fields** from the Paws.xlsx spreadsheet
- **Full medical tracking** (treatments, vaccinations, weight log)
- **Foster management** (up to 3 foster placements)
- **Adoption workflow** with automated emails
- **Public/Internal field visibility** control
- **Admin dashboard** with tabbed form interface
- **Email automation** (Submit, Update, Email Owner, Test Email)

## Files Created

### Database Tables (in `/tables`)
1. **39_org_9_paws_animals.xs** - Main puppy records (218 fields)
2. **40_paws_field_config.xs** - Field visibility configuration
3. **41_paws_email_templates.xs** - Email automation templates

### API Endpoints (in `/apis/paws`)
1. **api_group.xs** - API group configuration
2. **100_get_animals_GET.xs** - List all puppies
3. **101_get_animal_GET.xs** - Get single puppy
4. **102_create_animal_POST.xs** - Create new puppy
5. **103_update_animal_PATCH.xs** - Update puppy
6. **104_delete_animal_DELETE.xs** - Delete puppy
7. **105_get_field_config_GET.xs** - Get field configuration
8. **106_update_field_config_PATCH.xs** - Update field config
9. **107_send_email_POST.xs** - Send automated emails
10. **108_get_public_animals_GET.xs** - Public animal list (website)
11. **109_get_public_animal_detail_GET.xs** - Public animal detail

### Admin Dashboard (in `/admin-dashboard/src`)
1. **pages/Animals.tsx** - Enhanced with conditional PAWS system for Org 9
2. **components/PawsAnimalList.tsx** - Puppy list table (Org 9 only)
3. **components/PawsAnimalForm.tsx** - Add/Edit form with 6 tabs (Org 9 only)
4. **lib/xano.ts** - Updated with PAWS API functions
5. **components/Layout.tsx** - Shows "(PAWS)" label for Org 9

### Documentation
1. **docs/PAWS_SYSTEM.md** - Complete system documentation
2. **docs/PAWS_QUICK_START.md** - This file

## Next Steps

### 1. Deploy to Xano

The Xano tables and APIs need to be deployed/imported into your Xano instance:

```bash
# Option 1: Use Xano Dashboard
# - Go to Xano dashboard
# - Import the .xs files from /tables and /apis/paws

# Option 2: Use deployment script (if available)
# Run the Xano deployment script for tables 39-41 and paws APIs
```

### 2. Configure Environment Variables

Add to `admin-dashboard/.env`:

```env
VITE_XANO_PAWS_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:paws_api
```

### 3. Seed Field Configuration

You'll want to create initial field configuration records to define which fields are public vs internal. Create a script or manually add records to `paws_field_config` table:

Example records:
```json
{
  "field_name": "dog_name",
  "field_label": "Dog Name",
  "section": "Basic Information",
  "visibility": "public",
  "display_order": 1,
  "field_type": "text",
  "is_active": true
}

{
  "field_name": "puppy_placement_private_notes",
  "field_label": "Private Notes",
  "section": "Adoption Details",
  "visibility": "internal",
  "display_order": 99,
  "field_type": "textarea",
  "is_active": true
}
```

### 4. Set Up Email Templates

Add records to `paws_email_templates` table:

**Submit Email**:
```json
{
  "org": 9,
  "template_name": "submit",
  "label": "Submit Action",
  "subject": "Woohoo! [DogName] is officially yours!",
  "body": "Hi [PuppyPlacement2.Name]...",
  "from_email": "admin@mbpups.org",
  "from_name": "Mission Bay Puppy Rescue",
  "to_emails": ["[PuppyPlacement2.AboutYou2.Email]"],
  "send_when": "when",
  "send_condition": "Status is Submitted",
  "change_status_to": "Submitted",
  "attach_uploaded_files": true,
  "attach_documents": true,
  "is_active": true
}
```

Repeat for "update", "email_owner", and "test_email" templates.

### 5. Test the System

1. **Access Admin**: Go to `https://app.barkhaus.io/mbpr/animals`
2. **Add Test Puppy**: Click "+ Add New Puppy" and fill in basic info
3. **Test Tabs**: Navigate through all 6 tabs
4. **Test Email**: Use "Send Test Email" action
5. **View Public**: Check public API: `/paws/public/animals?org=9`

## How to Use

### Adding a New Puppy

1. Navigate to `/mbpr/animals` (PAWS system automatically loads for Org 9)
2. Click "+ Add New Puppy"
3. Fill in required fields (Dog Name at minimum)
4. Navigate tabs to add additional information:
   - **Basic Info**: Name, Breed, Gender, Age
   - **Background**: Foster info, Origin
   - **Health**: Medical history, Treatments
   - **Vaccinations**: Bordatella, DAPP, Rabies
   - **Adoption**: Adopter details, Fees
   - **Images**: Upload photos
5. Click "Create Puppy"

### Managing Vaccinations

1. Edit puppy
2. Go to "Vaccinations" tab
3. Check "Administered" for each vaccine
4. Enter date and location
5. Save

### Processing an Adoption

1. Edit puppy when adopter is found
2. Go to "Adoption Details" tab
3. Enter adopter name and email
4. Set adoption fee and payment method
5. Check all contract agreement boxes
6. Change "Entry Status" to "Submitted" (in Basic Info tab)
7. Save puppy
8. From list view, click "Actions" → "Send Submit Email"
9. Confirmation email sent to adopter with attachments!

### Sending Updates to Adopters

1. Make any changes to puppy record
2. Save changes
3. Click "Actions" → "Email Owner"
4. Updated files/info sent to adopter

## Email Workflow

Based on your Cognito Forms screenshots, here are the 4 email workflows:

### 1. Submit (Status: Submitted)
- **Trigger**: Manual button click or status change to "Submitted"
- **To**: Adopter email (`puppy_placement_about_you_2_email`)
- **Subject**: "Woohoo! [DogName] is officially yours!"
- **Attachments**: Adoption Contract, Dog Profile, Documents
- **Action**: Changes status to "Submitted"

### 2. Update (Internal Only)
- **Trigger**: Manual button click
- **To**: Internal staff emails
- **Subject**: "Updates Saved!"
- **Message**: Simple confirmation
- **Action**: No status change

### 3. Email Owner (Always)
- **Trigger**: Manual button click
- **To**: Adopter email
- **Subject**: "Updated Files for [DogName]"
- **Attachments**: Latest uploaded files and documents
- **Action**: No status change

### 4. Test Email (Always)
- **Trigger**: Manual button click
- **To**: Test email (e.g., kristin@mbpups.org)
- **Subject**: "Paws - [PrivateNotes]"
- **Purpose**: Testing attachments and formatting
- **Action**: No status change

## Field Visibility Guide

### Public Fields (Visible on Website)
- Dog Name, Breed, Gender
- Age, Birthday
- My Story, Markings
- Size When Grown
- Images
- Vaccination status (yes/no only)
- Is Fixed (yes/no)
- Location
- Litter Name
- Intake Date

### Internal Fields (Admin Only)
- Private Notes
- Foster contact details
- Detailed medical treatments
- Adoption fee amounts
- Payment methods
- Contract signatures
- Deposit tracking
- Relinquishing person info
- Internal codes (Paws ID, Dog ID)
- Detailed medication dosages

## Integration with Public Website

To display puppies on your public website (for Org 9):

```javascript
// In your Astro/React component
const PAWS_API = 'https://xz6u-fpaz-praf.n7e.xano.io/api:paws_api';

// Fetch available puppies
const response = await fetch(`${PAWS_API}/public/animals?org=9&status=Available`);
const { animals } = await response.json();

// Display on our-animals page
animals.forEach(puppy => {
  // Each puppy has: id, dog_name, breed, gender, age_weeks,
  // my_story, images, vaccinations, etc.
});

// Fetch single puppy detail
const detail = await fetch(`${PAWS_API}/public/animals/${puppyId}`);
const puppy = await detail.json();
```

## Troubleshooting

### "Field not showing in form"
- Check tab - fields are organized across 6 tabs
- Verify field exists in table schema

### "Email not sending"
- Check email template is active in `paws_email_templates`
- Verify dynamic field syntax: `[DogName]` not `{DogName}`
- Check send condition matches (e.g., status must be "Submitted")

### "Public API returns too many fields"
- Public APIs filter to only public fields
- Check `paws_field_config` table for field visibility settings

### "Can't see PAWS menu"
- PAWS menu only shows for Org 9 (MBPR)
- Check organization ID in database

## Support & Documentation

- **Full Documentation**: See `docs/PAWS_SYSTEM.md`
- **Field Reference**: All 218 fields documented in PAWS_SYSTEM.md
- **API Reference**: Complete endpoint documentation in PAWS_SYSTEM.md
- **Email Template Syntax**: Dynamic field examples in PAWS_SYSTEM.md

---

## Summary

You now have a complete PAWS system with:
- ✅ All 218 fields from Paws.xlsx
- ✅ Org-specific table for Org 9
- ✅ Admin dashboard with comprehensive form
- ✅ Field visibility control (internal vs public)
- ✅ Automated email workflows
- ✅ Public APIs for website integration
- ✅ Complete documentation

Next: Deploy to Xano, seed initial data, and start managing puppies! 🐾
