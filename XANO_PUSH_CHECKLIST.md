# Xano Push Checklist - Simplified MBPR PAWS

## ✅ Fixed Issues
- Removed APIs referencing deleted tables (`paws_field_config`, `paws_email_templates`)
- Simplified email API to work without templates
- All syntax errors fixed (no `or` operators, using proper `if-then-else`)

## 📋 Files to Push via VSCode Xano Extension

### 1. Table (1 file)
- ✅ `tables/39_mbpr_puppies.xs` - Main puppies table with 30 fields

### 2. API Group (1 file)
- ✅ `apis/paws/api_group.xs` - API group configuration with CORS settings

### 3. API Endpoints (8 files)
- ✅ `apis/paws/100_get_animals_GET.xs` - List all puppies
- ✅ `apis/paws/101_get_animal_GET.xs` - Get single puppy
- ✅ `apis/paws/102_create_animal_POST.xs` - Create new puppy
- ✅ `apis/paws/103_update_animal_PATCH.xs` - Update puppy
- ✅ `apis/paws/104_delete_animal_DELETE.xs` - Delete puppy
- ✅ `apis/paws/107_send_email_POST.xs` - Simplified email (no templates)
- ✅ `apis/paws/108_get_public_animals_GET.xs` - Public list for website
- ✅ `apis/paws/109_get_public_animal_detail_GET.xs` - Public detail for website

### ❌ Removed Files (Do NOT push)
- ~~`apis/paws/105_get_field_config_GET.xs`~~ - Deleted (referenced non-existent table)
- ~~`apis/paws/106_update_field_config_PATCH.xs`~~ - Deleted (referenced non-existent table)

## 🚀 Push Instructions

1. Open VSCode Xano extension (left sidebar)
2. You should see these 10 files ready to push:
   - 1 table file
   - 1 API group file
   - 8 API endpoint files
3. Select all PAWS files
4. Click Push/Upload button
5. All syntax errors have been fixed - push should succeed!

## 🧪 After Push - Test These URLs

### Admin APIs (requires auth)
- GET `/paws/animals` - List all puppies
- GET `/paws/animals/{id}` - Get single puppy
- POST `/paws/animals` - Create puppy
- PATCH `/paws/animals/{id}` - Update puppy
- DELETE `/paws/animals/{id}` - Delete puppy
- POST `/paws/send-email` - Send email notification

### Public APIs (no auth required)
- GET `/paws/public/animals` - Public list for website
- GET `/paws/public/animals/{id}` - Public detail for website

## 📝 Notes
- Org ID defaults to 9 (MBPR) if not specified
- Public APIs only return public fields (excludes internal admin fields)
- Email API simplified - no templates, just basic notification prep
- Medical notes stored as JSON array: `[{date, note, files}, ...]`
