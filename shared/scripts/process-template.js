#!/usr/bin/env node

/**
 * Template Processing Script
 * 
 * This script processes template files and replaces tokens with values from a configuration file.
 * Usage: node scripts/process-template.js <config-file-path> [output-directory]
 * 
 * Example: node scripts/process-template.js examples/construction-company.config.json ./output
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TemplateProcessor {
  constructor(configPath, outputDir = './output') {
    this.configPath = configPath;
    this.outputDir = outputDir;
    this.config = this.loadConfig();
    this.templateFiles = [
      'src/pages/index.astro',
      'src/pages/about.astro',
      'src/pages/our-animals.astro',
      'src/pages/applications.astro',
      'src/pages/donate.astro',
      'src/pages/events.astro',
      'src/pages/contact.astro',
      'src/pages/animal-details/[id].astro',
      'src/layouts/BaseLayout.astro',
      'src/data/client.json',
      'src/data/navData.json',
      'src/styles/root.less',
      'src/styles/dark.less',
      'astro.config.mjs',
      'package.json'
    ];
  }

  loadConfig() {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error(`Error loading config file: ${error.message}`);
      process.exit(1);
    }
  }

  // Extract all tokens from the configuration
  extractTokens(obj, prefix = '') {
    const tokens = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(tokens, this.extractTokens(value, prefix + key + '.'));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(tokens, this.extractTokens(item, `${prefix}${key}.${index}.`));
          } else {
            tokens[`{{${prefix}${key}.${index}}}`] = item;
          }
        });
      } else {
        tokens[`{{${prefix}${key}}}`] = value;
      }
    }
    
    return tokens;
  }

  // Replace tokens in content
  replaceTokens(content, tokens) {
    let processedContent = content;
    
    for (const [token, value] of Object.entries(tokens)) {
      const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(regex, value);
    }
    
    return processedContent;
  }

  // Process a single file
  processFile(filePath, tokens) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const processedContent = this.replaceTokens(content, tokens);
      
      const outputPath = path.join(this.outputDir, filePath);
      const outputDirPath = path.dirname(outputPath);
      
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, processedContent, 'utf8');
      console.log(`✓ Processed: ${filePath} -> ${outputPath}`);
    } catch (error) {
      console.error(`✗ Error processing ${filePath}: ${error.message}`);
    }
  }

  // Copy assets and other files
  copyAssets() {
    const assetDirs = ['public', 'src/assets', 'src/components', 'src/content', 'src/icons', 'src/js'];

    assetDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const outputPath = path.join(this.outputDir, dir);
        try {
          execSync(`cp -r ${dir} ${path.dirname(outputPath)}`, { stdio: 'inherit' });
          console.log(`✓ Copied: ${dir} -> ${outputPath}`);
        } catch (error) {
          console.error(`✗ Error copying ${dir}: ${error.message}`);
        }
      }
    });

    // Ensure admin setup is complete
    this.ensureAdminSetup();
  }

  // Ensure admin files are properly set up
  ensureAdminSetup() {
    const adminDir = path.join(this.outputDir, 'public', 'admin');

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
    <title>Content Management System - Admin</title>
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
      console.log(`✓ Created: admin/index.html -> ${adminIndexPath}`);
    }

    // Create default config.yml if it doesn't exist
    const configPath = path.join(adminDir, 'config.yml');
    if (!fs.existsSync(configPath)) {
      const configContent = `# Use DecapBridge auth (required)
backend:
  name: git-gateway
  repo: CodeStitchOfficial/Intermediate-Astro-Decap-CMS
  branch: main
  identity_url: https://auth.decapbridge.com/sites/1ea1e8dd-3c54-40d7-bbe1-74af6c8f16f6
  gateway_url: https://gateway.decapbridge.com

  # Quickly see who did what (optional)
  commit_messages:
    create: Create {{collection}} "{{slug}}" - {{author-name}} <{{author-login}}> via DecapBridge
    update: Update {{collection}} "{{slug}}" - {{author-name}} <{{author-login}}> via DecapBridge
    delete: Delete {{collection}} "{{slug}}" - {{author-name}} <{{author-login}}> via DecapBridge
    uploadMedia: Upload "{{path}}" - {{author-name}} <{{author-login}}> via DecapBridge
    deleteMedia: Delete "{{path}}" - {{author-name}} <{{author-login}}> via DecapBridge
    openAuthoring: Message {{message}} - {{author-name}} <{{author-login}}> via DecapBridge

# Logo for Decap login page. Change url to a link to the image you want to use, no file paths, must be a URL
logo_url: https://decapbridge.com/decapcms-with-bridge.svg

# Add site link in DecapCMS (optional)
site_url: https://intermediate-astro-kit-decap-cms.netlify.app

media_folder: src/assets/images/blog # Location where files will be stored in the repo - we store them in src so that Astro can optimize them.
public_folder: src/assets/images/blog # Ensure that this path is the same as the media_folder path above.

collections:
  - name: "blog" # Used in routes, e.g., /admin/collections/blog. Is also the key when fetching data from the CMS.
    label: "Blog" # Used in the admin dashboard UI
    folder: "src/content/blog" # The path to the folder where the documents are stored
    create: true # Allow users to create new documents in this collection
    fields: # The fields for each document
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Description", name: "description", widget: "string" }
      - { label: "Author", name: "author", widget: "string" }
      - { label: "Date", name: "date", widget: "datetime" }
      - { label: "Cover Image", name: "image", widget: "image" }
      - { label: "Image Caption", name: "imageAlt", widget: "string" }
      - { label: "Is it a featured post?", name: "isFeatured", widget: "boolean", default: false }
      - { label: "Body", name: "body", widget: "markdown" }
`;

      fs.writeFileSync(configPath, configContent);
      console.log(`✓ Created: admin/config.yml -> ${configPath}`);
    }

    console.log(`✓ Admin setup verified and complete`);
  }

  // Generate package.json with updated name and description
  generatePackageJson(tokens) {
    const packageJsonPath = 'package.json';
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Update package.json with site-specific information
      packageJson.name = this.config.site.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      packageJson.description = this.config.site.description;
      packageJson.homepage = this.config.site.url;
      
      const outputPath = path.join(this.outputDir, 'package.json');
      fs.writeFileSync(outputPath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log(`✓ Generated: package.json -> ${outputPath}`);
    }
  }

  // Main processing function
  process() {
    console.log(`🚀 Processing template with config: ${this.configPath}`);
    console.log(`📁 Output directory: ${this.outputDir}`);
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    // Extract all tokens from config
    const tokens = this.extractTokens(this.config);
    console.log(`📝 Found ${Object.keys(tokens).length} tokens to replace`);
    
    // Process template files
    this.templateFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        this.processFile(filePath, tokens);
      } else {
        console.warn(`⚠️  Template file not found: ${filePath}`);
      }
    });
    
    // Generate updated package.json
    this.generatePackageJson(tokens);
    
    // Copy assets and other files
    this.copyAssets();
    
    // Copy additional config files
    const additionalFiles = ['.gitignore', 'README.md', 'tsconfig.json'];
    additionalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const outputPath = path.join(this.outputDir, file);
        fs.copyFileSync(file, outputPath);
        console.log(`✓ Copied: ${file} -> ${outputPath}`);
      }
    });
    
    console.log(`\n✅ Template processing complete!`);
    console.log(`📁 Generated site available in: ${this.outputDir}`);
    console.log(`\nNext steps:`);
    console.log(`1. cd ${this.outputDir}`);
    console.log(`2. npm install`);
    console.log(`3. npm run dev`);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node scripts/process-template.js <config-file-path> [output-directory]');
    console.error('Example: node scripts/process-template.js examples/construction-company.config.json ./output');
    process.exit(1);
  }
  
  const configPath = args[0];
  const outputDir = args[1] || './output';
  
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }
  
  const processor = new TemplateProcessor(configPath, outputDir);
  processor.process();
}

export default TemplateProcessor;
