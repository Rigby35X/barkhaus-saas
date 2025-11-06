# Xano Multi-Tenant Database Integration Setup

This guide will help you connect your animal rescue website to your Xano multi-tenant database.

## 🎯 Quick Setup

### 1. Environment Configuration

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual Xano configuration:

```env
# Your Xano workspace URL
PUBLIC_XANO_BASE_URL=https://your-workspace-id.us-east-1.xano.io/api:version

# Organization ID for this specific rescue site
PUBLIC_ORG_ID=happy-paws-rescue

# Optional: API Key if your endpoints require authentication
XANO_API_KEY=your-api-key-if-needed
```

### 2. Xano Multi-Tenant Database Schema

Your Xano database should have these tables:

#### **Organizations Table (`orgs`)**
- `id` (Integer, Primary Key)
- `name` (Text) - Organization name
- `email` (Text) - Contact email
- `phone` (Text) - Contact phone
- `address` (Text) - Physical address
- `website` (Text) - Website URL
- `description` (Text) - About the organization
- `logo` (Text) - Logo image URL
- `primary_color` (Text) - Brand color (hex)
- `secondary_color` (Text) - Secondary brand color
- `facebook_url` (Text) - Facebook page URL
- `instagram_url` (Text) - Instagram URL
- `twitter_url` (Text) - Twitter URL

#### **Animals Table (`animals`)**
- `org_id` (Integer, Foreign Key to orgs.id)

Your `animals` table should have these fields:

#### Required Fields:
- `id` (Integer, Primary Key)
- `name` (Text)
- `breed` (Text)
- `age` (Text)
- `gender` (Text)
- `size` (Text)
- `description` (Text)
- `status` (Text) - "Available", "Adopted", "Pending"

#### Optional Fields:
- `type` (Text) - "Dog", "Cat", etc.
- `weight` (Text)
- `arrival_date` (Date)
- `primary_image` (Text) - URL to main photo
- `images` (JSON Array) - Array of image URLs
- `special_needs` (Boolean)
- `good_with_kids` (Boolean)
- `good_with_cats` (Boolean)
- `good_with_dogs` (Boolean)
- `personality` (Text) - Comma-separated traits
- `spayed_neutered` (Boolean)
- `vaccinated` (Boolean)
- `microchipped` (Boolean)
- `medical_notes` (Text)
- `adoption_fee` (Integer)
- `fosterable` (Boolean)
- `energy_level` (Text) - "Low", "Medium", "High"
- `training_level` (Text) - "Basic", "Intermediate", "Advanced"

### 3. Xano Multi-Tenant API Endpoints

Create these API endpoints in your Xano workspace:

#### GET `/orgs/{orgId}/animals`
- Returns all animals for a specific organization
- Filters by `org_id = {orgId}`
- No authentication required (public data)

#### GET `/orgs/{orgId}/animals/{id}`
- Returns a single animal by ID for a specific organization
- Filters by `org_id = {orgId}` AND `id = {id}`
- No authentication required (public data)

#### GET `/organizations/{orgId}`
- Returns organization information
- Used for branding, contact info, etc.
- No authentication required (public data)

#### Example Xano Function for `/orgs/{orgId}/animals`:
```javascript
// In your Xano function
const { orgId } = request.params;

// Query animals table with org_id filter
const animals = await xano.db.animals.getMany({
  org_id: orgId,
  status: 'Available' // Optional: only return available animals
});

return animals;
```

### 4. Test Your Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit your animals page: `http://localhost:4321/our-animals/`

3. Check the browser console for any API errors

### 5. Fallback Data

If Xano is unavailable, the site will automatically use fallback data to ensure it still works during development or if the API is down.

## 🔧 Advanced Configuration

### Custom Field Mapping

If your Xano fields have different names, update the mapping in `src/lib/xano.js`:

```javascript
// Example: if your field is called 'animal_name' instead of 'name'
name: animal.animal_name,
```

### Adding Authentication

If you need to protect your API endpoints:

1. Add authentication headers in `src/lib/xano.js`
2. Store API keys in environment variables
3. Update fetch calls to include auth headers

### Image Handling

For animal photos:
1. Upload images to Xano's file storage
2. Store the URLs in your `images` field
3. Use the `primary_image` field for the main photo

## 🚀 Going Live

### Environment Variables

Create a `.env` file for production:

```env
XANO_BASE_URL=https://your-workspace-id.us-east-1.xano.io/api:version
XANO_API_KEY=your-api-key-if-needed
```

### Build and Deploy

```bash
npm run build
```

Your site will now use live data from Xano!

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**: Enable CORS in your Xano workspace settings
2. **404 Errors**: Check your API endpoint URLs
3. **Empty Data**: Verify your database has animals with `status: "Available"`
4. **Image Issues**: Ensure image URLs are publicly accessible

### Debug Mode:

Check the browser console for detailed error messages. The Xano integration includes comprehensive error logging.

## 📞 Support

If you need help setting up Xano:
1. Check the browser console for error messages
2. Verify your API endpoints in Xano
3. Test API calls directly in Xano's API explorer
4. Ensure your database has sample data

Your animal rescue website will automatically display real data from Xano once configured! 🐕🐱
