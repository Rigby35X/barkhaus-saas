import { defineMiddleware } from 'astro:middleware';

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
      tenantSlug = subdomain;
      console.log('📍 Subdomain detected:', subdomain);

      // Look up tenant in Xano by subdomain (not slug!)
      const xanoUrl = `${import.meta.env.XANO_API_URL}/organizations`;
      const response = await fetch(`${xanoUrl}?subdomain=${subdomain}`);

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          organizationData = data[0];
          orgId = organizationData.id;
          tenantSlug = organizationData.slug; // Use the actual slug from Xano
          console.log('✅ Found organization by subdomain:', subdomain, '-> orgId:', orgId, organizationData.name);
        } else {
          console.log('❌ No organization found for subdomain:', subdomain);
        }
      }
    }
    // Check if it's a custom domain (e.g., mbpups.org)
    else if (!host.includes('barkhaus.io') && !host.includes('localhost')) {
      console.log('🌐 Custom domain detected:', host);
      
      // Look up tenant by custom domain in Xano
      const xanoUrl = `${import.meta.env.XANO_API_URL}/domains`;
      const response = await fetch(`${xanoUrl}?domain=${host}`);
      
      if (response.ok) {
        const domainData = await response.json();
        if (domainData && domainData.length > 0) {
          tenantSlug = domainData[0].tenant_slug;
          orgId = domainData[0].organization_id;
          
          // Fetch full organization data
          const orgResponse = await fetch(`${import.meta.env.XANO_API_URL}/organizations/${orgId}`);
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
      const xanoUrl = `${import.meta.env.XANO_API_URL}/organizations/${orgId}`;
      const response = await fetch(xanoUrl);
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
