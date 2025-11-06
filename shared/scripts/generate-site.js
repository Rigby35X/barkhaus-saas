#!/usr/bin/env node

/**
 * Quick Site Generator
 * 
 * This script provides an interactive way to generate a new site from the template.
 * Usage: node scripts/generate-site.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import TemplateProcessor from './process-template.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateSite() {
  console.log('🎨 Welcome to the Astro Decap CMS Site Generator!\n');
  
  // Show available templates
  const examplesDir = 'examples';
  const availableTemplates = [];
  
  if (fs.existsSync(examplesDir)) {
    const files = fs.readdirSync(examplesDir);
    files.forEach((file, index) => {
      if (file.endsWith('.config.json')) {
        availableTemplates.push(file);
        console.log(`${index + 1}. ${file.replace('.config.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      }
    });
  }
  
  console.log(`${availableTemplates.length + 1}. Custom configuration file\n`);
  
  const choice = await question('Select a template (enter number): ');
  const choiceNum = parseInt(choice);
  
  let configPath;
  
  if (choiceNum >= 1 && choiceNum <= availableTemplates.length) {
    configPath = path.join(examplesDir, availableTemplates[choiceNum - 1]);
  } else if (choiceNum === availableTemplates.length + 1) {
    configPath = await question('Enter path to your custom config file: ');
  } else {
    console.error('Invalid choice. Exiting.');
    rl.close();
    return;
  }
  
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    rl.close();
    return;
  }
  
  const outputDir = await question('Enter output directory (default: ./output): ') || './output';
  
  console.log(`\n🚀 Generating site...`);
  console.log(`📋 Config: ${configPath}`);
  console.log(`📁 Output: ${outputDir}\n`);
  
  try {
    const processor = new TemplateProcessor(configPath, outputDir);
    processor.process();
    
    console.log(`\n🎉 Site generated successfully!`);
    console.log(`\nTo get started:`);
    console.log(`  cd ${outputDir}`);
    console.log(`  npm install`);
    console.log(`  npm run dev`);
    
  } catch (error) {
    console.error(`❌ Error generating site: ${error.message}`);
  }
  
  rl.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSite();
}
