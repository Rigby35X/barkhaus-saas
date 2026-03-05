#!/usr/bin/env node

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

async function diagnose() {
  console.log('Fetching sample applications...\n');

  const response = await fetch(`${XANO_API_URL}?org_id=${MBPR_ORG_ID}&limit=5`);
  const result = await response.json();

  // Handle both array and paginated responses
  const apps = Array.isArray(result) ? result : (result.items || result.data || []);

  if (!apps || apps.length === 0) {
    console.log('No applications found or unexpected response format');
    console.log('Response:', JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Analyzing ${apps.length} sample applications:\n`);

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    console.log('═'.repeat(70));
    console.log(`SAMPLE ${i + 1}:`);
    console.log('═'.repeat(70));
    console.log(`App ID: ${app.id}`);
    console.log(`Type: ${app.application_type}`);
    console.log(`Name: ${app.applicant_name}`);
    console.log(`Email: ${app.applicant_email}`);

    console.log(`\n📅 DATES:`);
    console.log(`  submission_date (DB): ${app.submission_date}`);
    if (app.submission_date) {
      const date = new Date(app.submission_date);
      console.log(`  → Converts to: ${date.toISOString()}`);
      console.log(`  → Year: ${date.getFullYear()}`);
    }

    console.log(`\n📋 ADOPTION CODE:`);
    console.log(`  adoption_code (DB): "${app.adoption_code || '(empty/null)'}"`);

    // Check form_data for original Excel values
    if (app.form_data) {
      console.log(`\n📦 FORM_DATA (Original Excel values):`);

      // Date fields
      const dateFields = Object.keys(app.form_data).filter(k =>
        k.toLowerCase().includes('date')
      );
      if (dateFields.length > 0) {
        console.log(`  Date fields:`);
        dateFields.slice(0, 5).forEach(field => {
          console.log(`    ${field}: ${app.form_data[field]}`);
        });
      }

      // Code fields
      const codeFields = Object.keys(app.form_data).filter(k =>
        k.toLowerCase().includes('code')
      );
      if (codeFields.length > 0) {
        console.log(`  Code fields:`);
        codeFields.forEach(field => {
          console.log(`    ${field}: "${app.form_data[field] || '(empty)'}"`);
        });
      }
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('DIAGNOSIS:');
  console.log('═'.repeat(70));

  const appsWith57839 = apps.filter(a => {
    const year = new Date(a.submission_date).getFullYear();
    return year > 50000;
  });

  const appsWithoutCode = apps.filter(a => !a.adoption_code || a.adoption_code === '');

  console.log(`Apps with year 57839 issue: ${appsWith57839.length}/${apps.length}`);
  console.log(`Apps without adoption code: ${appsWithoutCode.length}/${apps.length}`);
}

diagnose().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
