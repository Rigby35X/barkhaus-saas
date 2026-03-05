#!/usr/bin/env node

/**
 * Test sending an application with a 2021 date to verify API saves it correctly
 */

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

async function testOldDate() {
  console.log('Testing API with a 2021 date...\ n');

  // Excel serial for October 13, 2021 (from the oldest date we found)
  const excelSerial = 44482; // Oct 13, 2021

  // Convert to timestamp
  const EXCEL_EPOCH = new Date(1899, 11, 30);
  const millisPerDay = 24 * 60 * 60 * 1000;
  const timestamp2021 = EXCEL_EPOCH.getTime() + (excelSerial * millisPerDay);

  console.log('Excel serial:', excelSerial);
  console.log('Converted timestamp:', timestamp2021);
  console.log('Converted date:', new Date(timestamp2021).toISOString());
  console.log('Year:', new Date(timestamp2021).getFullYear());
  console.log('');

  const testApplication = {
    application_type: 'adoption',
    applicant_name: 'TEST 2021 DATE - Delete Me',
    applicant_email: 'test2021@example.com',
    applicant_phone: '555-2021',
    adoption_code: 'TEST-2021',
    submission_date: timestamp2021,
    form_data: {
      test: true,
      Entry_DateCreated: excelSerial
    },
    source: 'date_test',
    cognito_form_id: 999,
    cognito_entry_id: 'test_2021_date'
  };

  console.log('Sending application with submission_date:', timestamp2021);
  console.log('(Type:', typeof timestamp2021, ')');
  console.log('(Value as date:', new Date(timestamp2021).toISOString(), ')');
  console.log('');

  try {
    const response = await fetch(`${XANO_API_URL}?org_id=${MBPR_ORG_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testApplication)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ API Response:');
    console.log('  id:', result.id);
    console.log('  applicant_name:', result.applicant_name);
    console.log('  adoption_code:', result.adoption_code);
    console.log('  submission_date (raw):', result.submission_date);
    console.log('  submission_date (as date):', new Date(result.submission_date).toISOString());
    console.log('  submission_date (year):', new Date(result.submission_date).getFullYear());
    console.log('');

    const savedDate = new Date(result.submission_date);
    const expectedDate = new Date(timestamp2021);
    const savedYear = savedDate.getFullYear();
    const expectedYear = expectedDate.getFullYear();

    if (savedYear === expectedYear) {
      console.log('✅ Year matches! (' + expectedYear + ')');
    } else {
      console.log('❌ Year DOES NOT match!');
      console.log('   Expected year:', expectedYear);
      console.log('   Got year:', savedYear);
      console.log('   Expected date:', expectedDate.toISOString());
      console.log('   Got date:', savedDate.toISOString());
    }

    console.log('\n📌 Test application ID:', result.id, '(you may want to delete this)');
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testOldDate();
