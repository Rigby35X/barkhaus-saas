# PAWS System Deployment Guide

## Files to Deploy to Xano

### New Tables (Create these first)
1. `tables/39_org_9_paws_animals.xs`
2. `tables/40_paws_field_config.xs`
3. `tables/41_paws_email_templates.xs`

### New API Group and Endpoints
1. `apis/paws/api_group.xs` - API group configuration
2. `apis/paws/100_get_animals_GET.xs`
3. `apis/paws/101_get_animal_GET.xs`
4. `apis/paws/102_create_animal_POST.xs`
5. `apis/paws/103_update_animal_PATCH.xs`
6. `apis/paws/104_delete_animal_DELETE.xs`
7. `apis/paws/105_get_field_config_GET.xs`
8. `apis/paws/106_update_field_config_PATCH.xs`
9. `apis/paws/107_send_email_POST.xs`
10. `apis/paws/108_get_public_animals_GET.xs`
11. `apis/paws/109_get_public_animal_detail_GET.xs`

## Step-by-Step Deployment

### Method 1: Manual Import via Xano Dashboard (Recommended)

1. **Login to Xano**
   - Go to https://xano.com
   - Login to instance: `xz6u-fpaz-praf`
   - Select workspace: 1
   - Select branch: v1

2. **Create Tables**
   - Go to Database → Tables
   - Click "Import Table"
   - Upload `tables/39_org_9_paws_animals.xs`
   - Repeat for tables 40 and 41

3. **Create API Group**
   - Go to API → Add API Group
   - Import `apis/paws/api_group.xs`

4. **Create API Endpoints**
   - Inside the "Paws" API group
   - Click "Add Endpoint"
   - Import each endpoint file from `apis/paws/` (100-109)

### Method 2: Use Xano VSCode Extension (If Available)

1. Install Xano VSCode extension
2. Configure `.xano/config.json` (already done)
3. Use extension's push command

### Method 3: Create and Restore Backup

If you want to automate this:

```bash
# This would create a backup with all changes
# Then restore it to Xano
# (Advanced - requires careful testing)
```

## After Deploying to Xano

### Verify Tables Created

Check that these tables exist:
- ✅ org_9_paws_animals (218 fields)
- ✅ paws_field_config
- ✅ paws_email_templates

### Verify API Endpoints

Check that the "Paws" API group has 11 endpoints:
- GET /animals
- GET /animals/{id}
- POST /animals
- PATCH /animals/{id}
- DELETE /animals/{id}
- GET /field-config
- PATCH /field-config/{id}
- POST /send-email
- GET /public/animals
- GET /public/animals/{id}

### Get API URL

Once deployed, get the API base URL from Xano:
- Should be something like: `https://xz6u-fpaz-praf.n7e.xano.io/api:paws_api`

## Deploy Admin Dashboard

After Xano is deployed:

1. **Add Environment Variable**

   Create/update `admin-dashboard/.env`:
   ```env
   VITE_XANO_PAWS_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:paws_api
   ```

2. **Build and Deploy**
   ```bash
   cd admin-dashboard
   npm install
   npm run build:react
   ```

3. **Push to Git** (Vercel will auto-deploy)
   ```bash
   git add .
   git commit -m "Add PAWS system for Org 9"
   git push
   ```

4. **Verify Deployment**
   - Go to https://app.barkhaus.io/mbpr/animals
   - Should see "Animals (PAWS)" heading
   - Click "+ Add New Puppy"
   - Should see form with 6 tabs

## Troubleshooting

### Tables Not Importing
- Make sure to import tables BEFORE APIs
- Check for syntax errors in .xs files
- Verify you're on the correct branch (v1)

### APIs Not Working
- Verify table names match exactly
- Check API group was created first
- Verify all input/output schemas are correct

### Admin Dashboard Not Loading PAWS
- Check environment variable is set
- Verify orgId === 9 in tenant hook
- Check browser console for errors
- Verify Xano API URLs are correct

## Need Help?

- Xano Docs: https://docs.xano.com
- Calycode CLI: https://github.com/calycode/xano-tools
- PAWS System Docs: See `docs/PAWS_SYSTEM.md`
