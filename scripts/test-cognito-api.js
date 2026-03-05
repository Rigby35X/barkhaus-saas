#!/usr/bin/env node

/**
 * Test script to diagnose Cognito Forms API connection
 */

const COGNITO_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ijg4YmYzNWNmLWM3ODEtNDQ3ZC1hYzc5LWMyODczMjNkNzg3ZCIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6IjViZGMxZDc1LWJhMDAtNDJiYS1hYzU0LTk4ZTc1YWNmY2VmMiIsImludGVncmF0aW9uSWQiOiJlZjM0NWNjOS00MTg1LTRlNmUtYWQ5MS1jYjJlMTI3MTZlN2EiLCJjbGllbnRJZCI6IjNkZTNmODMwLWNiYzctNDZlNi1iOTZlLTVmMDE2NzcyMTgzMCIsImp0aSI6ImY1ZDM3NjM0LWNiOWUtNGMyNi1hMTE3LTNlZTEzOTBhYzYwZCIsImlhdCI6MTc2MzAwNTM2OCwiaXNzIjoiaHR0cHM6Ly93d3cuY29nbml0b2Zvcm1zLmNvbS8iLCJhdWQiOiJhcGkifQ.YqI5R4XUDdQwOE5N5RLpBfchd__WA6ijEXXyGLAkVGc';

async function testAPI() {
  console.log('🔍 Testing Cognito Forms API Connection...\n');

  // Test 1: Try to list all forms
  console.log('Test 1: Listing all forms');
  console.log('─'.repeat(50));

  try {
    const response = await fetch('https://services.cognitoforms.com/api/forms', {
      headers: {
        'Authorization': `Bearer ${COGNITO_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const forms = await response.json();
      console.log('✅ Success! Found forms:');
      console.log(JSON.stringify(forms, null, 2));

      if (Array.isArray(forms) && forms.length > 0) {
        console.log('\n📋 Available Form IDs:');
        forms.forEach(form => {
          console.log(`  - ID: ${form.Id || form.id}, Name: ${form.Name || form.name}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:');
      console.log(errorText);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Try a different endpoint structure
  console.log('\n\nTest 2: Try getting entries with organization ID');
  console.log('─'.repeat(50));

  const orgId = '5bdc1d75-ba00-42ba-ac54-98e75acfcef2'; // From the JWT token

  try {
    const response = await fetch(`https://services.cognitoforms.com/api/organizations/${orgId}/forms`, {
      headers: {
        'Authorization': `Bearer ${COGNITO_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:');
      console.log(errorText);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Check API base endpoint
  console.log('\n\nTest 3: Check API base endpoint');
  console.log('─'.repeat(50));

  try {
    const response = await fetch('https://services.cognitoforms.com/api', {
      headers: {
        'Authorization': `Bearer ${COGNITO_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const data = await response.text();
    console.log('Response:', data.substring(0, 500));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAPI();
