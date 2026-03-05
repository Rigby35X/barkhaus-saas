#!/usr/bin/env node

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:0Mx5oX0z/applications';
const MBPR_ORG_ID = 9;

async function checkData() {
  const response = await fetch(`${XANO_API_URL}?org_id=${MBPR_ORG_ID}&limit=3`);
  const apps = await response.json();

  if (!apps || apps.length === 0) {
    console.log('No applications found');
    return;
  }

  console.log(`Checking ${apps.length} sample applications:\n`);

  for (const app of apps) {
    console.log('─'.repeat(70));
    console.log(`App ID: ${app.id}`);
    console.log(`Type: ${app.application_type}`);
    console.log(`Name: ${app.applicant_name}`);
    console.log(`Submission Date in DB: ${app.submission_date}`);
    console.log(`  → Converts to: ${new Date(app.submission_date).toISOString()}`);
    console.log(`Adoption Code in DB: "${app.adoption_code || ''}"`);

    // Check form_data
    if (app.form_data) {
      const dateFields = Object.keys(app.form_data).filter(k =>
        k.includes('Date') || k.includes('date')
      );
      const codeFields = Object.keys(app.form_data).filter(k =>
        k.includes('Code') || k.includes('code')
      );

      console.log(`\nDate fields in form_data:`);
      dateFields.forEach(field => {
        console.log(`  ${field}: ${app.form_data[field]}`);
      });

      console.log(`\nCode fields in form_data:`);
      codeFields.forEach(field => {
        console.log(`  ${field}: ${app.form_data[field]}`);
      });
    }
    console.log('');
  }
}

checkData().catch(console.error);
