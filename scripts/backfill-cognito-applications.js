#!/usr/bin/env node

/**
 * Backfill Script for Cognito Forms Applications
 *
 * This script fetches all historical entries from Cognito Forms
 * and imports them into the Xano applications table for MBPR.
 */

const COGNITO_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ijg4YmYzNWNmLWM3ODEtNDQ3ZC1hYzc5LWMyODczMjNkNzg3ZCIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6IjViZGMxZDc1LWJhMDAtNDJiYS1hYzU0LTk4ZTc1YWNmY2VmMiIsImludGVncmF0aW9uSWQiOiJlZjM0NWNjOS00MTg1LTRlNmUtYWQ5MS1jYjJlMTI3MTZlN2EiLCJjbGllbnRJZCI6IjNkZTNmODMwLWNiYzctNDZlNi1iOTZlLTVmMDE2NzcyMTgzMCIsImp0aSI6ImY1ZDM3NjM0LWNiOWUtNGMyNi1hMTE3LTNlZTEzOTBhYzYwZCIsImlhdCI6MTc2MzAwNTM2OCwiaXNzIjoiaHR0cHM6Ly93d3cuY29nbml0b2Zvcm1zLmNvbS8iLCJhdWQiOiJhcGkifQ.YqI5R4XUDdQwOE5N5RLpBfchd__WA6ijEXXyGLAkVGc';
const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications/cognito-webhook';
const MBPR_ORG_ID = 9;

// Form mapping
const FORMS = [
  { id: 1, name: 'Adoption', type: 'adoption' },
  { id: 2, name: 'Foster', type: 'foster' },
  { id: 5, name: 'Relinquishment', type: 'relinquishment' }
];

/**
 * Fetch all entries from a Cognito Form
 */
async function fetchCognitoEntries(formId) {
  const url = `https://services.cognitoforms.com/api/forms/${formId}/entries`;

  console.log(`📥 Fetching entries from form ${formId}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${COGNITO_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch form ${formId}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.length || 0} entries for form ${formId}`);
    return data;

  } catch (error) {
    console.error(`❌ Error fetching form ${formId}:`, error.message);
    return [];
  }
}

/**
 * Import an entry to Xano
 */
async function importToXano(entry, formId) {
  const url = `${XANO_API_URL}?org_id=${MBPR_ORG_ID}&cognito_form_id=${formId}&cognito_entry_id=${entry.Id || entry.Number}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to import entry: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main backfill function
 */
async function backfillApplications() {
  console.log('🚀 Starting Cognito Forms backfill for MBPR...\n');

  let totalImported = 0;
  let totalFailed = 0;
  const stats = {};

  for (const form of FORMS) {
    console.log(`\n📋 Processing ${form.name} Applications (Form ${form.id})...`);
    console.log('─'.repeat(50));

    // Fetch entries from Cognito Forms
    const entries = await fetchCognitoEntries(form.id);

    if (entries.length === 0) {
      console.log(`⚠️  No entries found for ${form.name}\n`);
      continue;
    }

    // Import each entry to Xano
    stats[form.name] = { total: entries.length, imported: 0, failed: 0 };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const entryId = entry.Id || entry.Number || i + 1;

      process.stdout.write(`  Importing entry ${i + 1}/${entries.length} (ID: ${entryId})... `);

      const result = await importToXano(entry, form.id);

      if (result.success) {
        console.log('✅');
        stats[form.name].imported++;
        totalImported++;
      } else {
        console.log(`❌ ${result.error}`);
        stats[form.name].failed++;
        totalFailed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n${form.name} Summary: ${stats[form.name].imported} imported, ${stats[form.name].failed} failed`);
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 BACKFILL COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Total Imported: ${totalImported}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log('\nBreakdown by form:');
  Object.entries(stats).forEach(([name, stat]) => {
    console.log(`  ${name}: ${stat.imported}/${stat.total} imported`);
  });
  console.log('\n✨ Done! Check app.barkhaus.io/mbpr to view the applications.');
}

// Run the backfill
backfillApplications().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
