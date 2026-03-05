#!/usr/bin/env node

/**
 * Delete all applications for org 9 and re-import with fixed data
 */

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

async function deleteAllApplications() {
  console.log('🗑️  Deleting old applications for org 9...\n');

  try {
    // Get all applications for org 9
    const response = await fetch(`${XANO_API_URL}?org_id=${MBPR_ORG_ID}&limit=10000`);
    if (!response.ok) {
      throw new Error('Failed to fetch applications');
    }

    const applications = await response.json();
    console.log(`Found ${applications.length} applications to delete`);

    // Delete each one
    let deleted = 0;
    for (const app of applications) {
      try {
        const deleteResponse = await fetch(`${XANO_API_URL}/${app.id}`, {
          method: 'DELETE'
        });

        if (deleteResponse.ok) {
          deleted++;
          process.stdout.write(`\r  Deleted ${deleted}/${applications.length} applications...`);
        }
      } catch (error) {
        console.error(`\nError deleting application ${app.id}:`, error.message);
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n✅ Deleted ${deleted} applications\n`);
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Delete and Re-import Applications\n');
  console.log('This will:');
  console.log('1. Delete all existing applications for org 9');
  console.log('2. Re-import from Excel with correct names, dates, and codes\n');

  // Delete old applications
  const deleted = await deleteAllApplications();

  if (deleted) {
    console.log('✨ Ready to re-import! Run:');
    console.log('   node scripts/import-excel-applications.js\n');
  } else {
    console.log('❌ Deletion failed. Please check the error and try again.\n');
    process.exit(1);
  }
}

main();
