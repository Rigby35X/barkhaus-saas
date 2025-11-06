#!/usr/bin/env node

/**
 * Generate Organization-Specific Site
 * 
 * This script creates a new site for a specific organization by:
 * 1. Copying the template
 * 2. Setting the organization ID in environment variables
 * 3. Optionally fetching organization data from Xano to populate config
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const orgId = args[0];
const siteName = args[1] || `${orgId}-site`;

if (!orgId) {
  console.error('❌ Error: Organization ID is required');
  console.log('Usage: node scripts/generate-org-site.js <orgId> [siteName]');
  console.log('Example: node scripts/generate-org-site.js happy-paws-rescue my-rescue-site');
  process.exit(1);
}

console.log(`🚀 Generating site for organization: ${orgId}`);
console.log(`📁 Site directory: ${siteName}`);

// Paths - use happy-paws-site as the template
const templateDir = path.join(__dirname, '../happy-paws-site');
const targetDir = path.join(process.cwd(), siteName);

// Check if target directory already exists
if (fs.existsSync(targetDir)) {
  console.error(`❌ Error: Directory ${siteName} already exists`);
  process.exit(1);
}

// Copy template to new directory
console.log('📋 Copying template files...');
copyDirectory(templateDir, targetDir);

// Create organization-specific .env file
console.log('⚙️ Creating environment configuration...');
createEnvFile(targetDir, orgId);

// Update package.json with new name
console.log('📦 Updating package.json...');
updatePackageJson(targetDir, siteName, orgId);

// Ensure admin setup is complete
console.log('🔧 Ensuring admin setup...');
ensureAdminSetup(targetDir, siteName);

console.log('✅ Site generation complete!');
console.log('');
console.log('🎯 Next steps:');
console.log(`1. cd ${siteName}`);
console.log('2. Update .env with your Xano workspace URL');
console.log('3. npm install');
console.log('4. npm run dev');
console.log('');
console.log('📖 See XANO-SETUP.md for detailed configuration instructions');

/**
 * Copy directory recursively, excluding certain files/folders
 */
function copyDirectory(src, dest) {
  const excludePatterns = [
    'node_modules',
    '.git',
    'dist',
    '.astro',
    '.env',
    '.DS_Store'
  ];

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip excluded patterns
    if (excludePatterns.some(pattern => entry.name.includes(pattern))) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Create .env file with organization-specific configuration
 */
function createEnvFile(targetDir, orgId) {
  const envContent = `# Xano Multi-Tenant Configuration for ${orgId}
# Update PUBLIC_XANO_BASE_URL with your actual Xano workspace URL

# Your Xano workspace URL
PUBLIC_XANO_BASE_URL=https://your-workspace-id.us-east-1.xano.io/api:version

# Organization ID for this specific rescue site
PUBLIC_ORG_ID=${orgId}

# Optional: API Key if your endpoints require authentication
# XANO_API_KEY=eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.fe0dF32JhQP3JtvhR9-0bEKK1qTVPxQXfcbvrDUKLq68CrVwrSfaILXl151Mi2vO7Ys2X5h8-EQDXE0MioBuYi5kBWxa0xSf.369K2Frf1xgKnm1aVQH5mg.1g6hAlBjN5DSabtzYFBB-H5yo4mdnImvm3LOVIRJeutLapHtUcRQHwXGXnKNMSFyVxxowRk7g-8n7yrA78lxKvBtciUwpxkiOH6wI7a4EkepbGRaBPWFU2oyhIVqYQ0lgwlTLU1gTOwaoOHHUZsOj7ff2pvHBrbZRo-j3mAaVZU.VmkH_L1dY6B5UqcMQLLHjjK7A4l6ozLwq82PAFL7OWg

# Environment
NODE_ENV=development
`;

  fs.writeFileSync(path.join(targetDir, '.env'), envContent);
}

/**
 * Update package.json with organization-specific information
 */
function updatePackageJson(targetDir, siteName, orgId) {
  const packageJsonPath = path.join(targetDir, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Update name and description
    packageJson.name = siteName;
    packageJson.description = `Animal rescue website for ${orgId}`;

    // Add organization-specific metadata
    packageJson.organization = {
      id: orgId,
      type: 'animal-rescue'
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
}

/**
 * Ensure admin setup is complete with all necessary files
 */
function ensureAdminSetup(targetDir, siteName) {
  const adminDir = path.join(targetDir, 'public', 'admin');

  // Create admin directory if it doesn't exist
  if (!fs.existsSync(adminDir)) {
    fs.mkdirSync(adminDir, { recursive: true });
  }

  // Create admin index.html if it doesn't exist
  const adminIndexPath = path.join(adminDir, 'index.html');
  if (!fs.existsSync(adminIndexPath)) {
    const adminIndexContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${siteName} - Admin</title>
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  </head>
  <body>
    <!-- Include the script that builds the page and powers Decap CMS -->
    <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>

    <!-- Netlify Identity Widget -->
    <script>
      if (window.netlifyIdentity) {
        window.netlifyIdentity.on("init", user => {
          if (!user) {
            window.netlifyIdentity.on("login", () => {
              document.location.href = "/admin/";
            });
          }
        });
      }
    </script>
  </body>
</html>`;

    fs.writeFileSync(adminIndexPath, adminIndexContent);
    console.log(`✓ Created: admin/index.html`);
  }

  // Ensure BaseLayout.astro has Netlify Identity widget
  const baseLayoutPath = path.join(targetDir, 'src', 'layouts', 'BaseLayout.astro');
  if (fs.existsSync(baseLayoutPath)) {
    let content = fs.readFileSync(baseLayoutPath, 'utf8');

    // Check if Netlify Identity widget is already included
    if (!content.includes('netlify-identity-widget.js')) {
      // Add Netlify Identity widget to head
      content = content.replace(
        /(\s*<!-- Sitewide Scripts -->)/,
        '\n            <!-- Netlify Identity Widget for CMS Authentication -->\n            <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>\n$1'
      );

      // Add initialization script before closing body tag
      content = content.replace(
        /(\s*<\/body>)/,
        '\n            <!-- Netlify Identity Widget Initialization -->\n            <script is:inline>\n              if (window.netlifyIdentity) {\n                window.netlifyIdentity.on("init", user => {\n                  if (!user) {\n                    window.netlifyIdentity.on("login", () => {\n                      document.location.href = "/admin/";\n                    });\n                  }\n                });\n              }\n            </script>$1'
      );

      fs.writeFileSync(baseLayoutPath, content);
      console.log(`✓ Updated: BaseLayout.astro with Netlify Identity widget`);
    }
  }

  console.log(`✓ Admin setup complete for ${siteName}`);
}
