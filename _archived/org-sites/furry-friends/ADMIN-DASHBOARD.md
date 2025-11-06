# Animal Rescue Admin Dashboard

A comprehensive admin dashboard that connects directly to your Xano database, allowing organizations to manage their animal rescue data in real-time.

## 🎯 Features

### ✅ **Complete Animal Management**
- **Add New Animals** - Full form with all animal details
- **Edit Existing Animals** - Update any animal information
- **Delete Animals** - Remove animals from the database
- **Filter & Search** - Find animals by status, species, or name
- **Real-time Updates** - Changes sync immediately with your live website

### ✅ **Organization Settings**
- **Update Organization Info** - Name, contact details, address
- **Manage Branding** - Colors, logo, website information
- **Social Media Links** - Facebook, Instagram, Twitter

### ✅ **Dashboard Analytics**
- **Animal Statistics** - Total, available, pending, adopted counts
- **Recent Animals** - Quick view of newest additions
- **Status Overview** - Visual status indicators

### ✅ **Security & Authentication**
- **Organization-specific Access** - Each org only sees their data
- **Session Management** - Secure login with session timeout
- **Access Control** - Simple but effective authentication

## 🚀 Quick Start

### 1. Access the Admin Dashboard

Visit your admin dashboard at:
```
https://your-site.com/admin/
```

### 2. Login Credentials

**For Demo/Testing:**
- **Organization ID:** `3`
- **Access Code:** `demo123`

**For Production:**
- Contact your system administrator for your organization's credentials

### 3. Start Managing Your Data

Once logged in, you can:
1. **View Dashboard** - See your animal statistics
2. **Manage Animals** - Add, edit, or remove animals
3. **Update Organization** - Modify your organization details
4. **Monitor Activity** - Track recent additions and changes

## 🔧 Technical Setup

### Environment Configuration

The dashboard uses your existing Xano configuration from `.env`:

```env
# Xano API URLs
VITE_XANO_ANIMALS_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:Od874PbA
VITE_XANO_ORGANIZATIONS_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz

# API Tokens
VITE_XANO_ANIMALS_TOKEN=165XkoniNXylFdNKgO_aCvmAIcQ
VITE_XANO_ORGANIZATIONS_TOKEN=YOUR_ORGANIZATIONS_TOKEN_HERE

# Organization ID
PUBLIC_ORG_ID=3
```

### API Endpoints

The dashboard uses these local API endpoints that proxy to Xano:

- **`/api/admin/animals`** - Animal CRUD operations
- **`/api/admin/organization`** - Organization management

### Database Schema

Your Xano database should have these tables:

#### **Animals Table**
- `id` (Primary Key)
- `org_id` (Foreign Key to organizations)
- `name`, `species`, `breed`, `age`, `gender`
- `size`, `weight`, `status`, `intake_date`
- `image_url`, `description`
- `special_needs`, `good_with_kids`, `good_with_cats`, `good_with_dogs`
- `spayed_neutered`, `vaccinated`, `microchip`
- `adoption_fee`, `medical_notes`

#### **Organizations Table**
- `id` (Primary Key)
- `name`, `email`, `phone`, `address`
- `website`, `description`
- `primary_color`, `secondary_color`
- `facebook_url`, `instagram_url`, `twitter_url`

## 📱 User Interface

### Dashboard View
- **Statistics Cards** - Quick overview of animal counts
- **Recent Animals** - Latest additions with photos
- **Status Indicators** - Color-coded status badges

### Animals Management
- **Data Table** - Sortable, filterable animal list
- **Add/Edit Modal** - Comprehensive animal form
- **Bulk Actions** - Filter by status, species, or search terms

### Organization Settings
- **Contact Information** - Update all organization details
- **Branding** - Manage colors and visual identity
- **Social Media** - Link to your social platforms

## 🔒 Security Features

### Authentication
- **Session-based Login** - Secure session management
- **Organization Isolation** - Each org only accesses their data
- **Session Timeout** - Automatic logout after 24 hours

### Data Protection
- **API Proxy** - Secure server-side API calls
- **Token Management** - API tokens stored securely on server
- **CORS Protection** - Proper cross-origin request handling

## 🛠 Customization

### Adding New Fields

To add new animal fields:

1. **Update the Xano database** - Add new columns
2. **Modify the API endpoints** - Update `/api/admin/animals.js`
3. **Update the admin form** - Add fields to the modal in `index.html`
4. **Update JavaScript** - Handle new fields in `admin-dashboard.js`

### Styling Customization

The dashboard uses Tailwind CSS. To customize:

1. **Colors** - Update the green color scheme in HTML classes
2. **Layout** - Modify the grid and flexbox layouts
3. **Components** - Customize cards, tables, and forms

### Adding New Features

The dashboard is modular and extensible:

- **Applications Management** - Track adoption applications
- **Events Calendar** - Manage rescue events
- **Volunteer Management** - Coordinate volunteers
- **Donation Tracking** - Monitor fundraising

## 📊 Data Flow

```
Admin Dashboard → Local API → Xano Database → Live Website
```

1. **Admin makes changes** in the dashboard
2. **Local API processes** the request securely
3. **Xano database** is updated in real-time
4. **Live website** reflects changes immediately

## 🐛 Troubleshooting

### Common Issues

**Login Problems:**
- Check organization ID and access code
- Clear browser cache and try again
- Verify session hasn't expired

**Data Not Loading:**
- Check browser console for API errors
- Verify Xano API tokens are correct
- Ensure organization ID exists in database

**Changes Not Saving:**
- Check network connection
- Verify API endpoints are accessible
- Check Xano database permissions

### Debug Mode

Open browser developer tools to see:
- **Console logs** - API calls and errors
- **Network tab** - Request/response details
- **Application tab** - Session storage data

## 📞 Support

For technical support:

1. **Check the browser console** for error messages
2. **Verify API configuration** in your `.env` file
3. **Test API endpoints** directly in Xano
4. **Contact your system administrator** for access issues

## 🎉 Success!

Your admin dashboard is now connected to your live Xano database! Organizations can:

- ✅ **Manage animals** in real-time
- ✅ **Update organization info** instantly
- ✅ **See changes** reflected on the live website immediately
- ✅ **Work securely** with organization-specific access

The dashboard provides a professional, user-friendly interface for managing your animal rescue data while maintaining security and data integrity.
