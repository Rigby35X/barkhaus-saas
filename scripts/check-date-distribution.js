#!/usr/bin/env node

const XANO_API_URL = 'https://xz6u-fpaz-praf.n7e.xano.io/api:tVL5q7Ta/applications';
const MBPR_ORG_ID = 9;

async function checkDates() {
  // Get more applications to check
  const response = await fetch(`${XANO_API_URL}?org_id=${MBPR_ORG_ID}&per_page=200`);
  const result = await response.json();
  const apps = Array.isArray(result) ? result : (result.items || result.data || []);

  console.log('Checking', apps.length, 'applications...\n');

  // Filter out test applications
  const realApps = apps.filter(a => {
    const name = a.applicant_name || '';
    return !name.includes('TEST') && !name.includes('test');
  });

  console.log('Real applications (non-test):', realApps.length, '\n');

  // Group by year
  const years = {};
  realApps.forEach(app => {
    const year = new Date(app.submission_date).getFullYear();
    years[year] = (years[year] || 0) + 1;
  });

  console.log('Year distribution in database (submission_date field):');
  Object.keys(years).sort().forEach(year => {
    console.log(`  ${year}: ${years[year]} applications`);
  });

  // Find oldest application
  realApps.sort((a, b) => a.submission_date - b.submission_date);
  const oldest = realApps[0];

  if (oldest) {
    console.log('\nOldest application in database:');
    console.log('  Name:', oldest.applicant_name);
    console.log('  submission_date:', new Date(oldest.submission_date).toISOString());
    console.log('  Year:', new Date(oldest.submission_date).getFullYear());

    // Check if form_data has older dates
    if (oldest.form_data && oldest.form_data.Entry_DateCreated) {
      const EXCEL_EPOCH = new Date(1899, 11, 30);
      const millisPerDay = 24 * 60 * 60 * 1000;
      const excelTimestamp = EXCEL_EPOCH.getTime() + (oldest.form_data.Entry_DateCreated * millisPerDay);
      console.log('\n  But in form_data.Entry_DateCreated:');
      console.log('    Excel serial:', oldest.form_data.Entry_DateCreated);
      console.log('    Converts to:', new Date(excelTimestamp).toISOString());
      console.log('    Year:', new Date(excelTimestamp).getFullYear());
    }
  }

  // Check newest
  realApps.sort((a, b) => b.submission_date - a.submission_date);
  const newest = realApps[0];

  if (newest) {
    console.log('\nNewest application in database:');
    console.log('  Name:', newest.applicant_name);
    console.log('  submission_date:', new Date(newest.submission_date).toISOString());
    console.log('  Year:', new Date(newest.submission_date).getFullYear());
  }
}

checkDates().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
