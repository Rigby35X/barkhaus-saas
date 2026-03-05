#!/usr/bin/env node

const XLSX = require('xlsx');
const path = require('path');

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

const TEST_FILE = {
  path: '/Users/kristinschue/Desktop/ApplicationForm.xlsx',
  formId: 1,
  type: 'adoption',
  name: 'Adoption (TEST - 5 entries)'
};

function parseExcelFile(filePath) {
  try {
    console.log(`📖 Reading file: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ Parsed ${data.length} rows (will import first 5)\n`);
    return data.slice(0, 5); // Only first 5 entries
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return [];
  }
}

function extractApplicantInfo(row) {
  const firstName = row['AboutYou2_Name_First'] || '';
  const lastName = row['AboutYou2_Name_Last'] || '';
  const name = firstName && lastName ? `${firstName} ${lastName}` : '';
  const email = row['AboutYou2_Email'] || '';
  const phone = row['AboutYou2_CellPhone'] || '';
  return { name, email, phone };
}

async function importEntry(entry, formType, formId, entryNumber) {
  const url = `${XANO_API_URL}?org_id=${MBPR_ORG_ID}`;
  const applicantInfo = extractApplicantInfo(entry);

  const applicationData = {
    application_type: formType,
    applicant_name: applicantInfo.name,
    applicant_email: applicantInfo.email,
    applicant_phone: applicantInfo.phone,
    form_data: entry,
    source: 'excel_import_test',
    cognito_form_id: formId,
    cognito_entry_id: `test_${formId}_${entryNumber}`
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status} - ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testImport() {
  console.log('🧪 TEST IMPORT - First 5 Entries\n');
  console.log('='.repeat(70));

  const entries = parseExcelFile(TEST_FILE.path);
  if (entries.length === 0) {
    console.log('❌ No entries to import');
    return;
  }

  let imported = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const applicantInfo = extractApplicantInfo(entry);

    process.stdout.write(`[${i + 1}/${entries.length}] ${applicantInfo.name || 'No name'} (${applicantInfo.email || 'No email'})... `);

    const result = await importEntry(entry, TEST_FILE.type, TEST_FILE.formId, i + 1);

    if (result.success) {
      console.log('✅');
      imported++;
      console.log(`    Created application ID: ${result.data.id}`);
    } else {
      console.log('❌');
      console.log(`    Error: ${result.error}`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 TEST COMPLETE: ${imported} imported, ${failed} failed`);
  console.log('\nIf successful, check app.barkhaus.io/mbpr Applications tab');
}

testImport().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
