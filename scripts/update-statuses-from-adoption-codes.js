#!/usr/bin/env node

/**
 * Update existing applications to set status based on adoption_code
 */

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

/**
 * Extract status from adoption code by removing prefix (e.g., "1.LM" → "LM")
 */
function extractStatusFromAdoptionCode(adoptionCode) {
  if (!adoptionCode) return 'new';

  // Remove the prefix (e.g., "1.", "Z.", "X.") to get just the status
  const match = adoptionCode.match(/^[0-9A-Z]+\.(.+)$/);
  if (match) {
    return match[1].trim();
  }

  return adoptionCode.trim() || 'new';
}

async function updateStatuses() {
  console.log('🔄 Fetching all applications...\n');

  // Fetch all applications
  const response = await fetch(`${XANO_API_URL}?org_id=${MBPR_ORG_ID}&per_page=3000`);
  const result = await response.json();
  const apps = Array.isArray(result) ? result : (result.items || result.data || []);

  console.log(`Found ${apps.length} applications\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];

    // Extract status from adoption code
    const newStatus = extractStatusFromAdoptionCode(app.adoption_code);

    // Skip if status is already correct
    if (app.status === newStatus) {
      skipped++;
      continue;
    }

    process.stdout.write(`\r  Updating [${i + 1}/${apps.length}] ${app.applicant_name || 'No name'}... `);

    try {
      const updateResponse = await fetch(`${XANO_API_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: app.id,
          status: newStatus
        })
      });

      if (updateResponse.ok) {
        updated++;
        process.stdout.write(`✅ (${app.adoption_code} → ${newStatus})`);
      } else {
        failed++;
        process.stdout.write(`❌`);
      }
    } catch (error) {
      failed++;
      process.stdout.write(`❌`);
    }

    console.log(''); // New line

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 UPDATE COMPLETE');
  console.log('='.repeat(70));
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped (already correct): ${skipped}`);
  console.log(`❌ Failed: ${failed}\n`);
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Update Application Statuses from Adoption Codes          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

updateStatuses().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
