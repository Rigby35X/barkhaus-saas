#!/usr/bin/env node

const COGNITO_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ijg4YmYzNWNmLWM3ODEtNDQ3ZC1hYzc5LWMyODczMjNkNzg3ZCIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6IjViZGMxZDc1LWJhMDAtNDJiYS1hYzU0LTk4ZTc1YWNmY2VmMiIsImludGVncmF0aW9uSWQiOiJlZjM0NWNjOS00MTg1LTRlNmUtYWQ5MS1jYjJlMTI3MTZlN2EiLCJjbGllbnRJZCI6IjNkZTNmODMwLWNiYzctNDZlNi1iOTZlLTVmMDE2NzcyMTgzMCIsImp0aSI6ImY1ZDM3NjM0LWNiOWUtNGMyNi1hMTE3LTNlZTEzOTBhYzYwZCIsImlhdCI6MTc2MzAwNTM2OCwiaXNzIjoiaHR0cHM6Ly93d3cuY29nbml0b2Zvcm1zLmNvbS8iLCJhdWQiOiJhcGkifQ.YqI5R4XUDdQwOE5N5RLpBfchd__WA6ijEXXyGLAkVGc';

async function testInternalNames() {
  console.log('🔍 Testing with Internal Form Names...\n');

  const tests = [
    { name: 'ApplicationForm', id: 1 },
    { name: 'FosterApplication', id: 2 },
    { name: 'RelinquishmentForm', id: 5 }
  ];

  for (const test of tests) {
    console.log(`\nForm: ${test.name} (ID: ${test.id})`);
    console.log('─'.repeat(70));

    const endpoints = [
      `https://services.cognitoforms.com/api/${test.name}/entries`,
      `https://services.cognitoforms.com/api/forms/${test.name}/entries`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${COGNITO_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${endpoint}`);
          console.log(`   Entries: ${Array.isArray(data) ? data.length : 'unknown'}`);
          if (Array.isArray(data) && data.length > 0) {
            console.log('   Sample:', JSON.stringify(data[0], null, 2).substring(0, 300));
          }
          break;
        }
      } catch (error) {
        // Continue to next endpoint
      }
    }
  }

  // Also try to get form details
  console.log('\n\n🔍 Getting Form 1 Details...');
  console.log('─'.repeat(70));

  try {
    const response = await fetch('https://services.cognitoforms.com/api/forms/1', {
      headers: {
        'Authorization': `Bearer ${COGNITO_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const form = await response.json();
      console.log('✅ Form details retrieved:');
      console.log(JSON.stringify(form, null, 2).substring(0, 1000));
    } else {
      console.log(`❌ Status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testInternalNames();
