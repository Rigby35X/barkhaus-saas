#!/usr/bin/env node

/**
 * Test sending a single application to verify API is working correctly
 */

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

async function testSingleApplication() {
  console.log('Testing API with a single test application...\n');

  // Test data with explicit values
  const testApplication = {
    application_type: 'adoption',
    applicant_name: 'TEST USER - Delete Me',
    applicant_email: 'test@example.com',
    applicant_phone: '555-1234',
    adoption_code: 'TEST-CODE-123',
    submission_date: 1593561600000, // July 1, 2020 00:00:00 UTC
    form_data: {
      test: true,
      Entry_DateCreated: 44013 // July 1, 2020 in Excel serial
    },
    source: 'api_test',
    cognito_form_id: 999,
    cognito_entry_id: 'test_entry_001'
  };

  console.log('Sending test application:');
  console.log('  adoption_code:', testApplication.adoption_code);
  console.log('  submission_date:', testApplication.submission_date);
  console.log('  submission_date as date:', new Date(testApplication.submission_date).toISOString());
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
    console.log('  adoption_code:', result.adoption_code || '(undefined/null)');
    console.log('  submission_date:', result.submission_date);
    console.log('  submission_date as date:', new Date(result.submission_date).toISOString());
    console.log('');

    if (result.adoption_code === 'TEST-CODE-123') {
      console.log('✅ adoption_code saved correctly!');
    } else {
      console.log('❌ adoption_code NOT saved correctly!');
      console.log('   Expected: TEST-CODE-123');
      console.log('   Got:', result.adoption_code);
    }

    const savedDate = new Date(result.submission_date);
    const expectedDate = new Date(testApplication.submission_date);
    if (Math.abs(savedDate - expectedDate) < 1000) {
      console.log('✅ submission_date saved correctly!');
    } else {
      console.log('❌ submission_date NOT saved correctly!');
      console.log('   Expected:', expectedDate.toISOString());
      console.log('   Got:', savedDate.toISOString());
    }

    console.log('\n📌 Test application ID:', result.id, '(you may want to delete this)');
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSingleApplication();
