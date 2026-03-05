# PAWS - Puppy Animal Welfare System

## Overview

The PAWS system is a comprehensive animal management solution built specifically for **Org 9 (Mission Bay Puppy Rescue - MBPR)**. It provides full tracking of puppies from intake through adoption, including detailed medical records, vaccinations, foster information, and automated email workflows.

## System Architecture

### Database Tables

#### 1. `org_9_paws_animals` (Table ID: 39)
Main table storing all puppy information with **218 fields** organized into the following sections:

- **Basic Identification**: Code, Dog Name, Microchip, etc.
- **Dates**: Birthday, Intake Date, Adoption Date
- **Background**: Foster info, Origin, Litter details
- **Health Records**: Medical history, Treatments for various conditions
- **Vaccinations**: Bordatella, DAPP series, Rabies
- **Spay/Neuter**: Status, dates, voucher information
- **Adoption**: Contract details, Adopter information, Fees
- **Images**: Main image + 4 additional images

#### 2. `paws_field_config` (Table ID: 40)
Configuration table for managing field visibility and display:

- `field_name`: Internal field name
- `field_label`: Display label
- `section`: Grouping section
- `visibility`: "internal" (admin only) or "public" (website visible)
- `display_order`: Sort order within section
- `is_active`: Enable/disable field
- `field_type`: Data type (text, number, date, boolean)
- `validation_rules`: JSON validation rules

#### 3. `paws_email_templates` (Table ID: 41)
Email automation templates:

- `template_name`: Identifier (submit, update, email_owner, test_email)
- `subject`: Email subject with dynamic field support
- `body`: Email body with dynamic field support
- `to_emails`, `cc_emails`, `bcc_emails`: Recipient lists
- `send_condition`: When to trigger the email
- `change_status_to`: Auto-update animal status
- `attach_uploaded_files`, `attach_documents`: File attachments

### API Endpoints

Base URL: `{XANO_BASE_URL}/paws`

#### Animal Management

- **GET** `/animals` - List all PAWS animals
  - Query params: `org`, `status`, `limit`, `offset`
  - Returns: `{animals: [], total, limit, offset}`

- **GET** `/animals/{id}` - Get single animal
  - Returns: Full animal record

- **POST** `/animals` - Create new animal
  - Body: Animal data object
  - Returns: Created animal

- **PATCH** `/animals/{id}` - Update animal
  - Body: Partial animal data
  - Returns: Updated animal

- **DELETE** `/animals/{id}` - Delete animal
  - Returns: `{success: true, id}`

#### Public APIs (Frontend)

- **GET** `/public/animals` - Get public animal data
  - Only returns public fields
  - Query params: `org`, `status`, `limit`, `offset`

- **GET** `/public/animals/{id}` - Get public animal detail
  - Returns: Public fields only

#### Configuration & Email

- **GET** `/field-config` - Get field configuration
  - Query params: `org`, `section`, `visibility`

- **PATCH** `/field-config/{id}` - Update field config

- **POST** `/send-email` - Send automated email
  - Body: `{animal_id, template_name, org}`
  - Processes dynamic fields: `[DogName]`, `[PuppyPlacement2.Name]`, etc.

### Admin Interface

**Location**: `/{tenantSlug}/animals`

**For Org 9**: Enhanced PAWS system automatically loads
**For Other Orgs**: Standard animals interface

#### Features:

**1. List View**
- Filterable by status (All, Submitted, Available, Adopted)
- Table with: Code, Dog Name, Breed, Gender, Status, Age
- Actions: Edit, Delete, Email workflows

**2. Add/Edit Form**
Organized into 6 tabs:

- **Basic Info**: Name, Breed, Gender, Age, Microchip, Status
- **Background & Foster**: Foster details, Origin, Litter info
- **Health & Medical**: Illnesses, Treatments, Spay/Neuter, Weight log
- **Vaccinations**: Bordatella, DAPP 1-3, Rabies
- **Adoption Details**: Adopter info, Fees, Contract checkboxes
- **Images & Files**: Main image + 4 additional images

**3. Email Workflows**
Four automated email actions per animal:

- **Submit**: Send adoption confirmation to owner
- **Update**: Send update notification (internal)
- **Email Owner**: Send files/updates to adopter
- **Test Email**: Send test email to admin

## Field Visibility System

Fields can be configured as:

- **Internal**: Only visible in admin dashboard
- **Public**: Visible in both admin and public website

### Recommended Public Fields:

- Dog Name
- Breed
- Gender
- Age/Birthday
- My Story
- Markings
- Size
- Images
- Vaccination status (high-level)
- Fixed status
- Location

### Recommended Internal Fields:

- Private notes
- Foster contact details
- Medical treatment details
- Adoption fee details
- Contract signatures
- Internal codes
- Detailed medical history

## Email Templates

### Dynamic Field Syntax

Use square brackets for dynamic fields:
- `[DogName]` - Dog's name
- `[PuppyPlacement2.Name]` - Adopter's name
- `[PuppyPlacement2.PrivateNotes]` - Private adoption notes

### Template Examples

**Submit Email** (template_name: "submit"):
```
Subject: Woohoo! [DogName] is officially yours!
To: [PuppyPlacement2.AboutYou2.Email]
Condition: Status is Submitted

Body:
Congratulations! [DogName] is now officially part of your family!

Attached you'll find:
- Adoption Contract
- Dog Profile
- Spay/Neuter Contract (if applicable)
```

**Update Email** (template_name: "update"):
```
Subject: Updates Saved!
To: Internal staff
Condition: Always (for internal roles)

Body: The PAWS record has been updated successfully.
```

## Frontend Integration

### For Org 9 Public Website

Use the public API endpoints to display adoptable animals:

```javascript
// Fetch available puppies
const response = await fetch(`${XANO_BASE}/paws/public/animals?org=9&status=Available`);
const { animals } = await response.json();

// Each animal has public fields only:
// {
//   id, dog_name, breed, gender, age_weeks,
//   my_story, images, vaccinations, etc.
// }
```

### Display on our-animals Page

Show grid/list of available puppies with:
- Main image
- Name & breed
- Age
- Quick description
- "Learn More" link to detail page

### Display on Animal Detail Page

Show comprehensive public information:
- Image gallery
- Full story
- Vaccination status
- Weight history (chart)
- Contact form to apply

## Setup Instructions

### 1. Deploy Xano Tables

```bash
# Tables are already created in:
# - tables/39_org_9_paws_animals.xs
# - tables/40_paws_field_config.xs
# - tables/41_paws_email_templates.xs

# Deploy to Xano using the Xano CLI or dashboard import
```

### 2. Configure Field Visibility

Access the field config table and set up visibility rules for each field. Default recommended setup is in `scripts/seed-paws-field-config.js` (to be created).

### 3. Set Up Email Templates

Create email templates in the `paws_email_templates` table:

1. **Submit Template**
   - template_name: "submit"
   - Change status to: "Submitted"
   - Attachments: Adoption Contract, Dog Profile

2. **Update Template**
   - template_name: "update"
   - For internal roles only

3. **Email Owner Template**
   - template_name: "email_owner"
   - Send to: Adopter email
   - Attachments: Updated files

4. **Test Email Template**
   - template_name: "test_email"
   - Send to: Admin email
   - For testing purposes

### 4. Environment Variables

Add to admin dashboard `.env`:

```env
VITE_XANO_PAWS_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:paws_api
```

### 5. Admin Access

1. Navigate to `https://app.barkhaus.io/mbpr/animals`
2. PAWS system automatically loads for Org 9 (see "Animals (PAWS)" heading)
3. Start adding puppies!

## Usage Workflows

### Adding a New Puppy

1. Click "+ Add New Puppy"
2. Fill in Basic Info tab (minimum: Dog Name, Code)
3. Add Background & Foster info
4. Record Health & Medical details
5. Track Vaccinations
6. Upload Images
7. Save

### Tracking Medical History

1. Edit puppy
2. Go to Health & Medical tab
3. Check treatments as completed
4. Add dates and medication details
5. Track weight in Weight Log section
6. Save

### Adoption Process

1. Edit puppy when adopter found
2. Go to Adoption Details tab
3. Enter adopter information
4. Set adoption fee and payment
5. Check contract agreement boxes
6. Change status to "Submitted"
7. Click "Send Submit Email" from list view
8. Email automatically sent to adopter with contracts

### Updating Adopter

1. Make changes to puppy record
2. Save changes
3. From list view, click "Actions" → "Email Owner"
4. Updated files sent to adopter automatically

## Field Reference

### Key Fields by Section

**Basic Info** (20 fields)
- paws_id, code, dog_id, dog_name, pups_new_name
- litter_name, gender, breed, markings
- microchip_number, chip_manufacturer
- pup_birthday, age_weeks, intake_date
- entry_status

**Background** (24 fields)
- born_in_our_care, mothers_name, litter_counts
- acquired_from, located
- who_is_fostering, fosters_phone, fosters_address
- (Supports up to 3 foster placements)

**Health** (100+ fields)
- Treatments for: Tapeworms, Roundworms, Giardia, Coccidia, Parvo, CCV
- Flea/Tick/Mange treatments
- Hernia repair status
- Weight log (6 entries with dates)
- Treatment summaries

**Vaccinations** (20 fields)
- Bordatella, DAPP 1-3, Rabies
- Each with: administered flag, date, location

**Spay/Neuter** (10 fields)
- is_dog_fixed, spay_neuter_date
- Deposit tracking (waived, received, returned)
- Voucher signature and date

**Adoption** (20 fields)
- puppy_placement_name, email, fee, payment_method
- adoption_date, contract_signature
- 15+ contract agreement checkboxes
- private_notes

## Troubleshooting

### Email Not Sending

1. Check email template is active
2. Verify condition matches (e.g., status is "Submitted")
3. Check dynamic field syntax: `[FieldName]` not `{FieldName}`
4. Ensure recipient email addresses are valid

### Field Not Showing

1. Check `paws_field_config` table
2. Verify `is_active = true`
3. Check `visibility` setting matches context (internal vs public)
4. Verify `display_order` is set

### Image Upload Issues

1. Images currently managed via URL input
2. For file uploads, integrate with Xano file upload API
3. Or manage images directly in Xano dashboard

## Future Enhancements

1. **Direct File Upload**: Integrate Xano file upload for images
2. **Bulk Import**: Import puppies from Excel/CSV
3. **Medical Reports**: Generate PDF medical history
4. **Vaccination Reminders**: Auto-email when vaccinations due
5. **Public Application Form**: Embed on website for adoption applications
6. **Foster Portal**: Separate access for foster families
7. **Weight Chart**: Visual weight tracking over time
8. **Breed Predictor**: AI to estimate adult size based on breed mix

## Support

For questions or issues with the PAWS system:
- Admin access: Contact Barkhaus support
- Technical issues: Check Xano API logs
- Feature requests: Submit to product roadmap

---

**Version**: 1.0
**Last Updated**: 2025-11-13
**Organization**: Mission Bay Puppy Rescue (Org 9)
