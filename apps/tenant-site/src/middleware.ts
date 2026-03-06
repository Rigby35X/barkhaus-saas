import { defineMiddleware } from 'astro:middleware';
import https from 'node:https';
const _tlsAgent = new https.Agent({ rejectUnauthorized: false });

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get('host') || '';
  
  console.log('🔍 Middleware - Detected host:', host);
  
  let tenantSlug: string | null = null;
  let orgId: number | null = null;
  let organizationData: any = null;

  try {
    // Check if it's a subdomain (e.g., mbpups.barkhaus.io)
    if (host.includes('.barkhaus.io') && !host.startsWith('app.')) {
      const subdomain = host.split('.')[0];
      console.log('📍 Subdomain detected:', subdomain);

      // Fetch all organizations and filter by subdomain
      // Use the bark_haus_backend API group which has the organizations list endpoint
      const xanoUrl = 'https://xz6u-fpaz-praf.n7e.xano.io/api:wPrzs4Mr/organizations';
      const xanoToken = '165XkoniNXylFdNKgO_aCvmAIcQ';

      const response = await fetch(xanoUrl, {
        headers: {
          'Authorization': `Bearer ${xanoToken}`
        },
        agent: _tlsAgent,
      });

      if (response.ok) {
        const allOrgs = await response.json();
        console.log('📋 Fetched all organizations:', allOrgs.length);

        // Find organization by subdomain
        organizationData = allOrgs.find((org: any) => org.subdomain === subdomain);

        if (organizationData) {
          orgId = organizationData.id;
          tenantSlug = organizationData.slug; // Use the actual slug from Xano
          console.log('✅ Found organization by subdomain:', subdomain, '-> orgId:', orgId, organizationData.name);
        } else {
          console.log('❌ No organization found for subdomain:', subdomain);
          console.log('Available subdomains:', allOrgs.map((org: any) => org.subdomain).join(', '));
        }
      }
    }
    // Check if it's a custom domain (e.g., mbpups.org)
    else if (!host.includes('barkhaus.io') && !host.includes('localhost')) {
      console.log('🌐 Custom domain detected:', host);

      // Look up tenant by custom domain in Xano
      const xanoUrl = 'https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz/domains';
      const response = await fetch(`${xanoUrl}?domain=${host}`, { agent: _tlsAgent });
      
      if (response.ok) {
        const domainData = await response.json();
        if (domainData && domainData.length > 0) {
          tenantSlug = domainData[0].tenant_slug;
          orgId = domainData[0].organization_id;
          
          // Fetch full organization data
          const orgResponse = await fetch(`https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz/organizations/${orgId}`, { agent: _tlsAgent });
          if (orgResponse.ok) {
            organizationData = await orgResponse.json();
            console.log('✅ Found organization via custom domain:', orgId, organizationData.name);
          }
        } else {
          console.log('❌ No organization found for domain:', host);
        }
      }
    }
    // localhost or main barkhaus.io - use default demo tenant
    else if (host.includes('localhost')) {
      console.log('🏠 Localhost - using demo tenant');
      tenantSlug = 'demo';
      orgId = 9; // Mission Bay Puppy Rescue as default for testing

      // Fetch organization data
      const xanoUrl = `https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz/organizations/${orgId}`;
      const response = await fetch(xanoUrl, { agent: _tlsAgent });
      if (response.ok) {
        organizationData = await response.json();
        console.log('✅ Using demo organization:', orgId, organizationData.name);
      }
    }

  } catch (error) {
    console.error('❌ Error in tenant middleware:', error);
  }

  // Store tenant context in Astro.locals for pages to access
  context.locals.tenant = {
    slug: tenantSlug,
    orgId: orgId,
    organization: organizationData,
  };

  console.log('📦 Tenant context set:', context.locals.tenant);

  return next();
});
