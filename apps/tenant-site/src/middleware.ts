import { defineMiddleware } from 'astro:middleware';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

async function supabaseGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
  return res.json();
}

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get('host') || '';

  console.log('🔍 Middleware - Detected host:', host);

  let tenantSlug: string | null = null;
  let orgId: number | null = null;
  let organizationData: any = null;

  try {
    if (host.includes('.barkhaus.io') && !host.startsWith('app.')) {
      const subdomain = host.split('.')[0];
      console.log('📍 Subdomain detected:', subdomain);

      const rows = await supabaseGet(`organizations?select=*&subdomain=eq.${encodeURIComponent(subdomain)}`);
      if (rows && rows.length > 0) {
        organizationData = rows[0];
        orgId = organizationData.id;
        tenantSlug = organizationData.slug;
        console.log('✅ Found organization by subdomain:', subdomain, '-> orgId:', orgId, organizationData.name);
      } else {
        console.log('❌ No organization found for subdomain:', subdomain);
      }
    } else if (!host.includes('barkhaus.io') && !host.includes('localhost')) {
      console.log('🌐 Custom domain detected:', host);

      const rows = await supabaseGet(`organizations?select=*&custom_domain=eq.${encodeURIComponent(host)}`);
      if (rows && rows.length > 0) {
        organizationData = rows[0];
        orgId = organizationData.id;
        tenantSlug = organizationData.slug;
        console.log('✅ Found organization via custom domain:', orgId, organizationData.name);
      } else {
        console.log('❌ No organization found for domain:', host);
      }
    } else if (host.includes('localhost')) {
      console.log('🏠 Localhost - using demo tenant');
      orgId = 9;
      tenantSlug = 'demo';

      const rows = await supabaseGet(`organizations?select=*&id=eq.9`);
      if (rows && rows.length > 0) {
        organizationData = rows[0];
        console.log('✅ Using demo organization:', orgId, organizationData.name);
      }
    }
  } catch (error) {
    console.error('❌ Error in tenant middleware:', error);
  }

  context.locals.tenant = {
    slug: tenantSlug,
    orgId: orgId,
    organization: organizationData,
  };

  console.log('📦 Tenant context set:', context.locals.tenant);

  return next();
});
