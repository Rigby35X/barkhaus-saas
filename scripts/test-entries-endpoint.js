#!/usr/bin/env node

const COGNITO_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ijg4YmYzNWNmLWM3ODEtNDQ3ZC1hYzc5LWMyODczMjNkNzg3ZCIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6IjViZGMxZDc1LWJhMDAtNDJiYS1hYzU0LTk4ZTc1YWNmY2VmMiIsImludGVncmF0aW9uSWQiOiJlZjM0NWNjOS00MTg1LTRlNmUtYWQ5MS1jYjJlMTI3MTZlN2EiLCJjbGllbnRJZCI6IjNkZTNmODMwLWNiYzctNDZlNi1iOTZlLTVmMDE2NzcyMTgzMCIsImp0aSI6ImY1ZDM3NjM0LWNiOWUtNGMyNi1hMTE3LTNlZTEzOTBhYzYwZCIsImlhdCI6MTc2MzAwNTM2OCwiaXNzIjoiaHR0cHM6Ly93d3cuY29nbml0b2Zvcm1zLmNvbS8iLCJhdWQiOiJhcGkifQ.YqI5R4XUDdQwOE5N5RLpBfchd__WA6ijEXXyGLAkVGc';

async function testEntriesEndpoint() {
  console.log('🔍 Testing Cognito Forms Entries Endpoints...\n');

  const formId = 1; // Test with Application Form

  const endpoints = [
    `https://services.cognitoforms.com/api/forms/${formId}/entries`,
    `https://services.cognitoforms.com/forms/${formId}/entries`,
    `https://www.cognitoforms.com/api/forms/${formId}/entries`,
    `https://services.cognitoforms.com/api/entries?formId=${formId}`,
  ];

  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint}`);
    console.log('─'.repeat(70));

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${COGNITO_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! This endpoint works!');
        console.log(`Found ${Array.isArray(data) ? data.length : 'unknown'} entries`);

        if (Array.isArray(data) && data.length > 0) {
          console.log('\nFirst entry sample:');
          console.log(JSON.stringify(data[0], null, 2).substring(0, 500));
        } else if (data) {
          console.log('\nResponse structure:');
          console.log(JSON.stringify(data, null, 2).substring(0, 500));
        }

        console.log('\n🎯 USE THIS ENDPOINT! 🎯\n');
        break; // Found working endpoint, stop testing
      } else {
        const errorText = await response.text();
        console.log(`❌ Failed: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testEntriesEndpoint();
