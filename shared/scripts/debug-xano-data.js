#!/usr/bin/env node

/**
 * Debug Xano Data Structure
 * 
 * This script fetches and displays the raw data structure from Xano
 * to help debug any data transformation issues.
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
const XANO_ANIMALS_TOKEN = process.env.VITE_XANO_ANIMALS_TOKEN;
const ORG_ID = process.env.PUBLIC_ORG_ID || process.env.VITE_DEFAULT_ORG_ID || '3';

console.log('🔍 Debugging Xano Data Structure...');
console.log('');

/**
 * Get headers for API requests
 */
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (XANO_ANIMALS_TOKEN) {
    headers['Authorization'] = `Bearer ${XANO_ANIMALS_TOKEN}`;
  }
  
  return headers;
}

/**
 * Fetch and display raw animal data
 */
async function debugAnimalsData() {
  try {
    const url = `${XANO_ANIMALS_URL}/orgs/${ORG_ID}/animals`;
    console.log(`📡 Fetching from: ${url}`);
    
    const response = await fetch(url, {
      headers: getHeaders()
    });
    
    if (response.ok) {
      const rawData = await response.json();
      
      console.log(`✅ Success! Found ${rawData.length} animals`);
      console.log('');
      console.log('📋 Raw Data Structure:');
      console.log(JSON.stringify(rawData, null, 2));
      
      if (rawData.length > 0) {
        console.log('');
        console.log('🔍 First Animal Fields:');
        const firstAnimal = rawData[0];
        Object.keys(firstAnimal).forEach(key => {
          console.log(`   ${key}: ${typeof firstAnimal[key]} = ${firstAnimal[key]}`);
        });
      }
      
      return rawData;
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return null;
  }
}

// Run the debug
debugAnimalsData().catch(console.error);
