#!/usr/bin/env node

function extractStatusFromAdoptionCode(adoptionCode) {
  if (!adoptionCode) return 'new';
  const match = adoptionCode.match(/^[0-9A-Z]+\.(.+)$/);
  if (match) {
    return match[1].trim();
  }
  return adoptionCode.trim() || 'new';
}

// Test with the statuses from the Excel file
const testCodes = [
  '1.LM',
  '2.Call Later',
  '3.VIP',
  '4.Approved',
  '5.Approved: Adult',
  '6.Conditional Approval',
  '7.Adopted: MBPR',
  '8.Adopted: Other',
  '9.Foster',
  'X.Volunteer',
  'Y.Returned',
  'Z.Denied',
  '' // empty
];

console.log('Testing status extraction from adoption codes:\n');
testCodes.forEach(code => {
  const status = extractStatusFromAdoptionCode(code);
  console.log(`  "${code}" → "${status}"`);
});
