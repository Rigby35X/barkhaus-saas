#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const orgSites = [
  'org-sites/furry-friends',
  'org-sites/happy-paws', 
  'org-sites/loving-tails',
  'org-sites/paws-hearts',
  'org-sites/rescue-rangers',
  'org-sites/second-chance'
];

const paragonJsContent = `// Paragon SDK Integration
import { paragon } from '@useparagon/connect';

// Initialize Paragon when the page loads
document.addEventListener('astro:page-load', () => {
  console.log('🔗 Paragon SDK loaded and ready');
  
  // Initialize Paragon with your configuration
  // You can add your Paragon project ID and other configuration here
  // Example:
  // paragon.init({
  //   projectId: 'your-project-id',
  //   // other configuration options
  // });
});

// Export paragon for use in other modules if needed
export { paragon };`;

console.log('🚀 Adding Paragon SDK to all org-sites...\n');

orgSites.forEach(siteDir => {
  console.log(`📁 Processing ${siteDir}...`);
  
  try {
    // 1. Install Paragon SDK
    console.log(`  📦 Installing @useparagon/connect...`);
    execSync(`cd ${siteDir} && npm install @useparagon/connect`, { stdio: 'pipe' });
    
    // 2. Create paragon.js file
    const jsDir = path.join(siteDir, 'src', 'js');
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true });
    }
    
    const paragonJsPath = path.join(jsDir, 'paragon.js');
    fs.writeFileSync(paragonJsPath, paragonJsContent);
    console.log(`  ✅ Created ${paragonJsPath}`);
    
    // 3. Update BaseLayout.astro
    const baseLayoutPath = path.join(siteDir, 'src', 'layouts', 'BaseLayout.astro');
    if (fs.existsSync(baseLayoutPath)) {
      let content = fs.readFileSync(baseLayoutPath, 'utf8');
      
      // Check if paragon.js is already included
      if (!content.includes('paragon.js')) {
        // Add paragon.js script after nav.js
        content = content.replace(
          /(\s*<script src="@js\/nav\.js"><\/script>)/,
          '$1\n            <script src="@js/paragon.js"></script>'
        );
        
        fs.writeFileSync(baseLayoutPath, content);
        console.log(`  ✅ Updated ${baseLayoutPath}`);
      } else {
        console.log(`  ⚠️  ${baseLayoutPath} already includes paragon.js`);
      }
    } else {
      console.log(`  ⚠️  BaseLayout.astro not found in ${siteDir}`);
    }
    
    console.log(`  ✅ ${siteDir} completed\n`);
    
  } catch (error) {
    console.error(`  ❌ Error processing ${siteDir}: ${error.message}\n`);
  }
});

console.log('🎉 Paragon SDK integration complete for all org-sites!');
console.log('\n📝 Next steps:');
console.log('1. Configure your Paragon project ID in each paragon.js file');
console.log('2. Test the integration by checking browser console for "🔗 Paragon SDK loaded and ready"');
console.log('3. Implement your specific Paragon workflows as needed');
