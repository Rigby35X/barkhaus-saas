#!/usr/bin/env node

/**
 * Start All Organization Sites
 * 
 * This script starts development servers for all organization sites
 * on different ports so you can see them all running simultaneously
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Organization configurations
const organizations = [
  { name: "Happy Paws Dog Rescue", slug: "happy-paws", port: 4330 },
  { name: "Furry Friends Sanctuary", slug: "furry-friends", port: 4331 },
  { name: "Paws & Hearts Rescue", slug: "paws-hearts", port: 4332 },
  { name: "Second Chance Animal Rescue", slug: "second-chance", port: 4333 },
  { name: "Loving Tails Foundation", slug: "loving-tails", port: 4334 },
  { name: "Rescue Rangers Network", slug: "rescue-rangers", port: 4335 }
];

const orgSitesDir = path.join(__dirname, '../org-sites');

console.log('🚀 Starting all organization websites...\n');

// Check if org-sites directory exists
if (!fs.existsSync(orgSitesDir)) {
  console.error('❌ org-sites directory not found!');
  console.log('Please run: node scripts/generate-multi-org-sites.js first');
  process.exit(1);
}

const processes = [];

// Start each organization site
organizations.forEach((org, index) => {
  const siteDir = path.join(orgSitesDir, org.slug);
  
  if (!fs.existsSync(siteDir)) {
    console.warn(`⚠️  Site directory not found: ${org.slug}`);
    return;
  }
  
  console.log(`🌐 Starting ${org.name}...`);
  console.log(`   📁 Directory: org-sites/${org.slug}`);
  console.log(`   🔗 URL: http://localhost:${org.port}`);
  
  // Start the development server
  const child = spawn('npm', ['run', 'dev'], {
    cwd: siteDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  
  // Handle output
  child.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('ready in') || output.includes('Local')) {
      console.log(`✅ ${org.name} is ready at http://localhost:${org.port}`);
    }
  });
  
  child.stderr.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('WARN') && !error.includes('deprecated')) {
      console.error(`❌ ${org.name} error:`, error);
    }
  });
  
  child.on('close', (code) => {
    console.log(`🔴 ${org.name} stopped (exit code: ${code})`);
  });
  
  processes.push({ name: org.name, process: child, port: org.port });
  
  // Add delay between starts to avoid port conflicts
  if (index < organizations.length - 1) {
    setTimeout(() => {}, 2000);
  }
});

console.log('\n⏳ Starting servers... (this may take a moment)\n');

// Wait a bit then show summary
setTimeout(() => {
  console.log('\n🎯 Organization Websites:');
  console.log('┌─────────────────────────────────┬─────────────────────────────────┐');
  console.log('│ Organization                    │ URL                             │');
  console.log('├─────────────────────────────────┼─────────────────────────────────┤');
  
  organizations.forEach(org => {
    const name = org.name.padEnd(31);
    const url = `http://localhost:${org.port}`.padEnd(31);
    console.log(`│ ${name} │ ${url} │`);
  });
  
  console.log('└─────────────────────────────────┴─────────────────────────────────┘');
  console.log('\n📋 Admin Dashboard: http://localhost:4325/admin/index.html');
  console.log('\n💡 Tips:');
  console.log('   • Each site shows only that organization\'s animals');
  console.log('   • All sites connect to the same Xano database');
  console.log('   • Use the admin dashboard to manage all organizations');
  console.log('   • Press Ctrl+C to stop all servers');
}, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping all organization websites...');
  
  processes.forEach(({ name, process }) => {
    console.log(`   Stopping ${name}...`);
    process.kill('SIGTERM');
  });
  
  setTimeout(() => {
    console.log('✅ All servers stopped');
    process.exit(0);
  }, 2000);
});

// Keep the script running
process.stdin.resume();
