#!/usr/bin/env node

/**
 * Import Cognito Forms applications from Excel exports
 */

const XLSX = require('xlsx');
const path = require('path');

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

const FILES = [
  {
    path: '/Users/kristinschue/Desktop/paws/ApplicationForm.xlsx',
    formId: 1,
    type: 'adoption',
    name: 'Adoption'
  },
  {
    path: '/Users/kristinschue/Desktop/paws/FosterApplication.xlsx',
    formId: 2,
    type: 'foster',
    name: 'Foster'
  },
  {
    path: '/Users/kristinschue/Desktop/paws/RelinquishmentForm.xlsx',
    formId: 5,
    type: 'relinquishment',
    name: 'Relinquishment'
  }
];

/**
 * Parse Excel file and convert to JSON
 */
function parseExcelFile(filePath) {
  try {
    console.log(`  📖 Reading file: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`  ✅ Parsed ${data.length} rows`);
    return data;
  } catch (error) {
    console.error(`  ❌ Error reading file: ${error.message}`);
    return [];
  }
}

/**
 * Convert Excel serial date to Unix timestamp (milliseconds)
 */
function excelDateToTimestamp(excelDate) {
  if (!excelDate) return Date.now();
  // Excel dates are days since 1900-01-01 (with 1900 incorrectly treated as leap year)
  const EXCEL_EPOCH = new Date(1899, 11, 30); // Dec 30, 1899
  const millisPerDay = 24 * 60 * 60 * 1000;
  return EXCEL_EPOCH.getTime() + (excelDate * millisPerDay);
}

/**
 * Extract applicant info from row data
 * Different forms use different field names
 */
function extractApplicantInfo(row, formType) {
  let firstName = '';
  let lastName = '';
  let name = '';
  let email = '';
  let phone = '';

  if (formType === 'relinquishment') {
    // Relinquishment forms use Name_First and Name_Last
    firstName = row['Name_First'] || '';
    lastName = row['Name_Last'] || '';
    email = row['Email'] || row['EmailAddress'] || '';
    phone = row['Phone'] || row['PhoneNumber'] || '';
  } else if (formType === 'foster') {
    // Foster forms combine name in AboutYou2_Name_First
    const fullName = row['AboutYou2_Name_First'] || '';
    const nameParts = fullName.trim().split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
    email = row['AboutYou2_Email'] || '';
    phone = row['AboutYou2_CellPhone'] || '';
  } else {
    // Adoption forms use AboutYou2_ prefix
    firstName = row['AboutYou2_Name_First'] || '';
    lastName = row['AboutYou2_Name_Last'] || '';
    email = row['AboutYou2_Email'] || '';
    phone = row['AboutYou2_CellPhone'] || '';
  }

  name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';

  return { name, email, phone };
}

/**
 * Extract status from adoption code by removing prefix (e.g., "1.LM" → "LM")
 */
function extractStatusFromAdoptionCode(adoptionCode) {
  if (!adoptionCode) return 'new';

  // Remove the prefix (e.g., "1.", "Z.", "X.") to get just the status
  // Pattern: number/letter + dot + status name
  const match = adoptionCode.match(/^[0-9A-Z]+\.(.+)$/);
  if (match) {
    return match[1].trim(); // Return the part after the dot
  }

  // If no dot found, return the code as-is
  return adoptionCode.trim() || 'new';
}

/**
 * Import a single entry to Xano
 */
async function importEntry(entry, formType, formId, entryNumber) {
  const url = `${XANO_API_URL}?org_id=${MBPR_ORG_ID}`;

  // Extract applicant info for the summary fields
  const applicantInfo = extractApplicantInfo(entry, formType);

  // Extract adoption code (for adoption forms)
  const adoptionCode = entry['Internal_AdoptionCode'] || '';

  // Extract status from adoption code (remove prefix like "1.", "Z.", etc.)
  const status = extractStatusFromAdoptionCode(adoptionCode);

  // Extract original submission date
  const originalDate = entry['Entry_DateCreated'] || entry['Entry_DateSubmitted'];
  const submissionDate = originalDate ? excelDateToTimestamp(originalDate) : Date.now();

  // Prepare the application data in the same format as the web forms
  const applicationData = {
    application_type: formType,
    applicant_name: applicantInfo.name,
    applicant_email: applicantInfo.email,
    applicant_phone: applicantInfo.phone,
    adoption_code: adoptionCode, // Keep full code with prefix
    status: status, // Extract status without prefix
    submission_date: submissionDate,
    form_data: entry, // Include all Excel data as form_data
    source: 'excel_import',
    cognito_form_id: formId,
    cognito_entry_id: `excel_${formId}_${entryNumber}`
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
  console.log('🚀 Starting Excel Import for MBPR Applications...\n');

  let totalImported = 0;
  let totalFailed = 0;
  const stats = {};

  for (const file of FILES) {
    console.log(`\n📋 Processing ${file.name} Applications`);
    console.log('─'.repeat(70));

    // Parse Excel file
    const entries = parseExcelFile(file.path);

    if (entries.length === 0) {
      console.log(`⚠️  No entries found or error reading file\n`);
      continue;
    }

    stats[file.name] = { total: entries.length, imported: 0, failed: 0 };

    // Import each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const applicantInfo = extractApplicantInfo(entry, file.type);

      process.stdout.write(`  [${i + 1}/${entries.length}] ${applicantInfo.name || 'No name'} (${applicantInfo.email || 'No email'})... `);

      const result = await importEntry(entry, file.type, file.formId, i + 1);

      if (result.success) {
        console.log('✅');
        stats[file.name].imported++;
        totalImported++;
      } else {
        console.log(`❌`);
        console.log(`      Error: ${result.error}`);
        stats[file.name].failed++;
        totalFailed++;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n  Summary: ${stats[file.name].imported}/${stats[file.name].total} imported, ${stats[file.name].failed} failed`);
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 IMPORT COMPLETE');
  console.log('='.repeat(70));
  console.log(`✅ Total Imported: ${totalImported}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log('\nBreakdown by form:');
  Object.entries(stats).forEach(([name, stat]) => {
    console.log(`  ${name}: ${stat.imported}/${stat.total} imported`);
  });
  console.log('\n✨ Done! Visit app.barkhaus.io/mbpr Applications tab to view them.');
}

// Run the import
importApplications().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
