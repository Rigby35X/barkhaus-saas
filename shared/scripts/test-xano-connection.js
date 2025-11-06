#!/usr/bin/env node

/**
 * Test Xano API Connection
 * 
 * This script tests the connection to your Xano API endpoints
 * to verify everything is working correctly.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../happy-paws-site/.env') });

// Xano configuration
const XANO_ANIMALS_URL = process.env.VITE_XANO_ANIMALS_URL;
const XANO_ORGANIZATIONS_URL = process.env.VITE_XANO_ORGANIZATIONS_URL;
const XANO_ANIMALS_TOKEN = process.env.VITE_XANO_ANIMALS_TOKEN;
const XANO_ORGANIZATIONS_TOKEN = process.env.VITE_XANO_ORGANIZATIONS_TOKEN;
const ORG_ID = process.env.PUBLIC_ORG_ID || process.env.VITE_DEFAULT_ORG_ID || '3';

console.log('🔍 Testing Xano API Connection...');
console.log('');
console.log('📋 Configuration:');
console.log(`   Animals URL: ${XANO_ANIMALS_URL}`);
console.log(`   Organizations URL: ${XANO_ORGANIZATIONS_URL}`);
console.log(`   Organization ID: ${ORG_ID}`);
console.log(`   Animals Token: ${XANO_ANIMALS_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`   Organizations Token: ${XANO_ORGANIZATIONS_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log('');

/**
 * Get headers for API requests
 */
function getHeaders(endpoint = 'animals') {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  switch (endpoint) {
    case 'animals':
      if (XANO_ANIMALS_TOKEN) {
        headers['Authorization'] = `Bearer ${XANO_ANIMALS_TOKEN}`;
      }
      break;
    case 'organizations':
      if (XANO_ORGANIZATIONS_TOKEN) {
        headers['Authorization'] = `Bearer ${XANO_ORGANIZATIONS_TOKEN}`;
      }
      break;
  }
  
  return headers;
}

/**
 * Test animals endpoint
 */
async function testAnimalsEndpoint() {
  console.log('🐕 Testing Animals Endpoint...');
  
  try {
    const url = `${XANO_ANIMALS_URL}/orgs/${ORG_ID}/animals`;
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      headers: getHeaders('animals')
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const animals = await response.json();
      console.log(`   ✅ Success! Found ${animals.length} animals`);
      
      if (animals.length > 0) {
        const firstAnimal = animals[0];
        console.log(`   📝 Sample animal: ${firstAnimal.name || firstAnimal.id}`);
      }
      
      return animals;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
    return null;
  }
}

/**
 * Test single animal endpoint
 */
async function testSingleAnimalEndpoint(animalId = '1') {
  console.log('');
  console.log('🐾 Testing Single Animal Endpoint...');
  
  try {
    const url = `${XANO_ANIMALS_URL}/orgs/${ORG_ID}/animals/${animalId}`;
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      headers: getHeaders('animals')
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const animal = await response.json();
      console.log(`   ✅ Success! Found animal: ${animal.name || animal.id}`);
      return animal;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
    return null;
  }
}

/**
 * Test organization endpoint
 */
async function testOrganizationEndpoint() {
  console.log('');
  console.log('🏢 Testing Organization Endpoint...');
  
  try {
    const url = `${XANO_ORGANIZATIONS_URL}/organizations/${ORG_ID}`;
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      headers: getHeaders('organizations')
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const org = await response.json();
      console.log(`   ✅ Success! Found organization: ${org.name || org.id}`);
      return org;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
    return null;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const animals = await testAnimalsEndpoint();
  
  // Test single animal if we have animals
  if (animals && animals.length > 0) {
    const firstAnimalId = animals[0].id || animals[0].dogs_id || '1';
    await testSingleAnimalEndpoint(firstAnimalId);
  } else {
    await testSingleAnimalEndpoint('1');
  }
  
  await testOrganizationEndpoint();
  
  console.log('');
  console.log('🎯 Test Summary:');
  console.log('   If all endpoints show ✅ Success, your Xano integration is ready!');
  console.log('   If you see ❌ errors, check your API endpoints and tokens in Xano.');
  console.log('');
  console.log('📖 Next steps:');
  console.log('   1. If tests pass: Your site will now show real data from Xano');
  console.log('   2. If tests fail: Check XANO-SETUP.md for troubleshooting');
  console.log('   3. Visit http://localhost:4321/our-animals/ to see your animals');
}

// Run the tests
runTests().catch(console.error);
