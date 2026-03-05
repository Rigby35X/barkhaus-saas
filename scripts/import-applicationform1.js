#!/usr/bin/env node

/**
 * Import ApplicationForm1_clean.xlsx to Xano applications table
 */

const XLSX = require('xlsx');
const path = require('path');

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;
const FILE_PATH = '/Users/kristinschue/Desktop/ApplicationForm1_clean.xlsx';

/**
 * Parse Excel file and convert to JSON
 */
function parseExcelFile(filePath) {
  try {
    console.log(`📖 Reading file: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ Parsed ${data.length} rows\n`);
    return data;
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return [];
  }
}

/**
 * Convert Excel serial date to Unix timestamp (milliseconds)
 */
function excelDateToTimestamp(excelDate) {
  if (!excelDate) return Date.now();
  const EXCEL_EPOCH = new Date(1899, 11, 30);
  const millisPerDay = 24 * 60 * 60 * 1000;
  return EXCEL_EPOCH.getTime() + (excelDate * millisPerDay);
}

/**
 * Extract applicant info from row data
 */
function extractApplicantInfo(row) {
  const firstName = row['AboutYou2_Name_First'] || '';
  const lastName = row['AboutYou2_Name_Last'] || '';
  const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
  const email = row['AboutYou2_Email'] || '';
  const phone = row['AboutYou2_CellPhone'] || '';

  return { name, email, phone };
}

/**
 * Extract status from adoption code
 */
function extractStatusFromAdoptionCode(adoptionCode) {
  if (!adoptionCode) return 'new';
  
  const match = adoptionCode.match(/^[0-9A-Z]+\.(.+)$/);
  if (match) {
    return match[1].trim();
  }
  
  return adoptionCode.trim() || 'new';
}

/**
 * Import a single entry to Xano
 */
async function importEntry(entry, entryNumber) {
  const url = `${XANO_API_URL}?org_id=${MBPR_ORG_ID}`;

  const applicantInfo = extractApplicantInfo(entry);
  const adoptionCode = entry['Internal_AdoptionCode'] || '';
  const status = extractStatusFromAdoptionCode(adoptionCode);
  const originalDate = entry['Entry_DateCreated'] || entry['Entry_DateSubmitted'];
  const submissionDate = originalDate ? excelDateToTimestamp(originalDate) : Date.now();

  const applicationData = {
    application_type: 'adoption',
    applicant_name: applicantInfo.name,
    applicant_email: applicantInfo.email,
    applicant_phone: applicantInfo.phone,
    adoption_code: adoptionCode,
    status: status,
    submission_date: submissionDate,
    form_data: entry,
    source: 'excel_import',
    cognito_form_id: 1,
    cognito_entry_id: `excel_1_${entryNumber}`
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(applicationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status} - ${errorText.substring(0, 200)}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main import function
 */
async function importApplications() {
  console.log('🚀 Starting ApplicationForm1_clean.xlsx Import...\n');

  const entries = parseExcelFile(FILE_PATH);

  if (entries.length === 0) {
    console.log('❌ No entries found or error reading file');
    process.exit(1);
  }

  let imported = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const applicantInfo = extractApplicantInfo(entry);

    process.stdout.write(`[${i + 1}/${entries.length}] ${applicantInfo.name || 'No name'} (${applicantInfo.email || 'No email'})... `);

    const result = await importEntry(entry, i + 1);

    if (result.success) {
      console.log('✅');
      imported++;
    } else {
      console.log(`❌ ${result.error}`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 IMPORT COMPLETE');
  console.log('='.repeat(70));
  console.log(`✅ Imported: ${imported}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${entries.length}`);
  console.log('\n✨ Done!');
}

importApplications().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
