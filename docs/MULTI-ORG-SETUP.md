# Multi-Organization Animal Rescue System

This system supports multiple animal rescue organizations with shared infrastructure but isolated data and branding.

## 🏢 System Overview

### **Data Source: Xano Database**
- **Organization Names**: Pulled from Xano `organizations` table
- **Animal Data**: Loaded from Xano `animals` table per organization
- **Real-time Data**: All data is live from your Xano database
- **No Hardcoded Data**: Organization info comes from API calls

### **Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Xano Database                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Organizations  │  │     Animals     │                  │
│  │     Table       │  │     Table       │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Admin Dashboard                             │
│           (Single Interface for All Orgs)                  │
│  • Barkhaus Admin can switch between organizations         │
│  • Each org sees only their data                           │
│  • Real-time data from Xano                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Organization Websites                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Happy Paws  │ │Furry Friends│ │Paws & Hearts│   ...    │
│  │ Port 4330   │ │ Port 4331   │ │ Port 4332   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### **1. Admin Dashboard (All Organizations)**
```bash
# Start the main admin dashboard
cd happy-paws-site
npm run dev
# Visit: http://localhost:4325/admin/index.html
```

**Login Credentials:**
- **ID 3**: `demo123` - Happy Paws Dog Rescue
- **ID 4**: `furry456` - Furry Friends Sanctuary  
- **ID 5**: `hearts789` - Paws & Hearts Rescue
- **ID 6**: `second123` - Second Chance Animal Rescue
- **ID 7**: `tails456` - Loving Tails Foundation
- **ID 8**: `barkhaus2024` - **Barkhaus Admin** (can switch between all orgs)
- **ID 9**: `rangers789` - Rescue Rangers Network

### **2. Generate Organization Websites**
```bash
# Generate all organization-specific websites
node scripts/generate-multi-org-sites.js
```

### **3. Start Individual Organization Sites**
```bash
# Happy Paws Dog Rescue
cd org-sites/happy-paws && npm install && npm run dev
# Visit: http://localhost:4330

# Furry Friends Sanctuary  
cd org-sites/furry-friends && npm install && npm run dev
# Visit: http://localhost:4331

# Paws & Hearts Rescue
cd org-sites/paws-hearts && npm install && npm run dev
# Visit: http://localhost:4332
```

### **4. Start All Sites Simultaneously**
```bash
# Start all organization websites at once
node scripts/start-all-org-sites.js
```

## 📊 Organization Data Sources

### **Where Organization Names Come From:**

1. **Primary Source: Xano API**
   ```javascript
   // Admin dashboard loads from:
   GET /api/admin/organization?orgId=3
   GET /api/admin/organization?orgId=4
   // etc...
   ```

2. **Fallback Data**: If Xano is unavailable, uses hardcoded fallback

3. **Real Organization Data**: 
   - Organization ID 3 exists in your Xano database
   - Contains 11 animals (including "Bear")
   - Real contact info, branding, social media links

### **Animal Data Sources:**

1. **Live from Xano**:
   ```javascript
   // Each org loads their animals:
   GET /api/admin/animals?orgId=3  // Happy Paws animals
   GET /api/admin/animals?orgId=4  // Furry Friends animals
   ```

2. **Admin View**: Barkhaus Admin (ID 8) can see all animals from all organizations

## 🎨 Organization-Specific Features

### **Each Organization Gets:**
- **Unique Branding**: Colors, logos, contact info from Xano
- **Isolated Animal Data**: Only their animals visible
- **Custom Domain**: Different ports for development
- **Social Media Integration**: Organization-specific accounts
- **Independent Configuration**: Separate .env files

### **Barkhaus Admin Powers (ID 8):**
- **Organization Switcher**: Dropdown in header to switch between orgs
- **Global Animal View**: Can see animals from all organizations
- **Cross-Organization Management**: Manage multiple rescues
- **Super Admin Access**: Full system control

## 🔧 Technical Implementation

### **Admin Dashboard Updates:**
1. **Real Xano Integration**: Loads organizations from API
2. **Dynamic Login Screen**: Shows all available organizations
3. **Organization Switching**: Admin can switch without logout
4. **Live Animal Data**: Pulls from Xano animals endpoint

### **Organization Website Generation:**
1. **Template Copying**: Each org gets full site copy
2. **Environment Configuration**: Org-specific .env files
3. **Port Assignment**: Unique ports for each organization
4. **Package.json Updates**: Org-specific metadata

### **Data Flow:**
```
Xano Database → API Endpoints → Admin Dashboard → Organization Websites
```

## 🌐 URLs and Ports

| Organization | Admin Login | Website URL | Port |
|-------------|-------------|-------------|------|
| Happy Paws Dog Rescue | ID: 3, Code: demo123 | http://localhost:4330 | 4330 |
| Furry Friends Sanctuary | ID: 4, Code: furry456 | http://localhost:4331 | 4331 |
| Paws & Hearts Rescue | ID: 5, Code: hearts789 | http://localhost:4332 | 4332 |
| Second Chance Animal Rescue | ID: 6, Code: second123 | http://localhost:4333 | 4333 |
| Loving Tails Foundation | ID: 7, Code: tails456 | http://localhost:4334 | 4334 |
| **Barkhaus Admin** | **ID: 8, Code: barkhaus2024** | **Admin Only** | **N/A** |
| Rescue Rangers Network | ID: 9, Code: rangers789 | http://localhost:4335 | 4335 |

**Admin Dashboard**: http://localhost:4325/admin/index.html

## 🔍 Verification Steps

### **1. Test Admin Dashboard:**
- Login with different organization IDs
- Verify each org shows different animals
- Test Barkhaus Admin organization switching

### **2. Test Organization Websites:**
- Each site shows only that org's animals
- Branding reflects organization identity
- Contact info matches organization data

### **3. Test Data Integration:**
- Animals come from Xano database
- Organization info loaded from API
- Real-time updates when data changes

## 📝 Next Steps

1. **Add Organizations to Xano**: Create entries for IDs 4-9 in your Xano organizations table
2. **Add Animals**: Populate animals for each organization in Xano
3. **Custom Branding**: Upload logos and set colors in Xano
4. **Domain Setup**: Configure custom domains for production
5. **SSL Certificates**: Set up HTTPS for production sites

## 🎯 Benefits

- **Scalable**: Easy to add new organizations
- **Isolated**: Each org's data is separate
- **Centralized Admin**: Manage all orgs from one dashboard
- **Real Data**: No hardcoded information
- **Professional**: Each org gets a complete website
- **Cost Effective**: Shared infrastructure, individual branding
