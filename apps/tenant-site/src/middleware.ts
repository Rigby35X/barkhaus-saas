import { defineMiddleware } from 'astro:middleware';
import { authorizeOrganization, needsOrganizationAccess } from './lib/organization-auth.js';

const DASHBOARD_ORIGIN = new URL(import.meta.env.DASHBOARD_ORIGIN || 'https://app.barkhaus.io').origin;
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

      const rows = await supabaseGet(`public_organizations?select=*&subdomain=eq.${encodeURIComponent(subdomain)}`);
      if (rows && rows.length > 0) {
        organizationData = rows[0];
        orgId = organizationData.id;
        tenantSlug = organizationData.slug;
        console.log('✅ Found organization by subdomain:', subdomain, '-> orgId:', orgId, organizationData.org);
      } else {
        console.log('❌ No organization found for subdomain:', subdomain);
      }
    } else if (!host.includes('barkhaus.io') && !host.includes('localhost')) {
      console.log('🌐 Custom domain detected:', host);

      const rows = await supabaseGet(`public_organizations?select=*&custom_domain=eq.${encodeURIComponent(host)}`);
      if (rows && rows.length > 0) {
        organizationData = rows[0];
        orgId = organizationData.id;
        tenantSlug = organizationData.slug;
        console.log('✅ Found organization via custom domain:', orgId, organizationData.org);
      } else {
        console.log('❌ No organization found for domain:', host);
      }
    } else if (host.includes('localhost')) {
      console.log('🏠 Localhost - using demo tenant');
      orgId = 9;
      tenantSlug = 'demo';

      const rows = await supabaseGet(`public_organizations?select=*&id=eq.9`);
      if (rows && rows.length > 0) {
        organizationData = rows[0];
        console.log('✅ Using demo organization:', orgId, organizationData.org);
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

  let path: string;
  try { path = decodeURIComponent(context.url.pathname).replace(/\/+/g, '/').replace(/\/$/, ''); }
  catch { return new Response('Invalid request path.', {status:400}); }
  if (needsOrganizationAccess(path, context.request.method)) {
    const cors = {
      'Access-Control-Allow-Origin': DASHBOARD_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'Vary':'Origin, Authorization',
    };
    let body: any = {};
    try {
      if (!['GET','HEAD','DELETE'].includes(context.request.method)) {
        if (context.request.headers.get('content-type')?.includes('multipart/form-data'))
          body = Object.fromEntries(await context.request.clone().formData());
        else body = await context.request.clone().json();
      }
    } catch { return new Response(JSON.stringify({error:'Invalid request body.'}), {status:400,headers:cors}); }
    const ids = [context.url.searchParams.get('orgId'),context.url.searchParams.get('org_id'),body.orgId,body.org_id]
      .filter(value => value !== undefined && value !== null);
    const canonicalId = ['GET','HEAD','DELETE'].includes(context.request.method)
      ? context.url.searchParams.get('orgId') : body.orgId;
    if (!canonicalId || !ids.length || ids.some(value => String(value) !== String(canonicalId)))
      return new Response(JSON.stringify({error:'One explicit, consistent organization is required.'}), {status:400,headers:cors});
    const access = await authorizeOrganization(context.request, ids[0], {url:SUPABASE_URL,key:SUPABASE_KEY});
    if (access.error) return new Response(JSON.stringify({error:access.error}), {status:access.status,headers:cors});
    // An organization-specific hostname must not act on a different organization.
    if (orgId && access.orgId !== orgId)
      return new Response(JSON.stringify({error:'Organization does not match this website.'}), {status:403,headers:cors});
    const response = await next();
    const secured = new Response(response.body, response);
    Object.entries(cors).forEach(([key,value]) => secured.headers.set(key,value));
    return secured;
  }
  if (path.startsWith('/api/') && context.request.method === 'OPTIONS') {
    return new Response(null,{status:204,headers:{
      'Access-Control-Allow-Origin':DASHBOARD_ORIGIN,
      'Access-Control-Allow-Headers':'Content-Type, Authorization',
      'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Vary':'Origin',
    }});
  }
  return next();
});
