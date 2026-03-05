#!/usr/bin/env node

/**
 * Delete all applications and re-import with correct statuses
 */

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

async function deleteAllApplications() {
  console.log('🗑️  Fetching all applications to delete...\n');

  // Fetch all applications
  const response = await fetch(`${XANO_API_URL}?org_id=${MBPR_ORG_ID}&per_page=3000`);
  const result = await response.json();
  const apps = Array.isArray(result) ? result : (result.items || result.data || []);

  console.log(`Found ${apps.length} applications to delete\n`);

  let deleted = 0;
  let failed = 0;

  for (const app of apps) {
    try {
      const deleteResponse = await fetch(`${XANO_API_URL}/${app.id}`, {
        method: 'DELETE'
      });

      if (deleteResponse.ok) {
        deleted++;
        process.stdout.write(`\r  Deleting... ${deleted}/${apps.length}`);
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\n\n✅ Deleted: ${deleted}`);
  console.log(`❌ Failed: ${failed}\n`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Delete All Applications and Re-import with Statuses      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Step 1: Delete all applications
  await deleteAllApplications();

  // Step 2: Re-import
  console.log('🚀 Starting re-import...\n');
  console.log('Run: node scripts/import-excel-applications.js');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
