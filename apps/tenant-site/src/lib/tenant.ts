// Tenant helper functions for use in Astro pages

export interface TenantContext {
  slug: string | null;
  orgId: number | null;
  organization: any;
}

/**
 * Get the current tenant from Astro.locals
 */
export function getTenant(locals: any): TenantContext {
  return locals.tenant || {
    slug: null,
    orgId: null,
    organization: null,
  };
}

/**
 * Check if a valid tenant is loaded
 */
export function hasTenant(locals: any): boolean {
  const tenant = getTenant(locals);
  return tenant.orgId !== null && tenant.organization !== null;
}

/**
 * Build Xano API URL with orgId filter
 */
export function buildApiUrl(endpoint: string, tenant: TenantContext, additionalParams?: Record<string, any>): string {
  const baseUrl = import.meta.env.XANO_API_URL;
  const url = new URL(`${baseUrl}${endpoint}`);
  
  if (tenant.orgId) {
    url.searchParams.append('organization_id', tenant.orgId.toString());
  }
  
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  return url.toString();
}

/**
 * Fetch data from Xano filtered by current tenant
 */
export async function fetchTenantData(endpoint: string, tenant: TenantContext, options?: RequestInit) {
  const url = buildApiUrl(endpoint, tenant);
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching tenant data from ${endpoint}:`, error);
    throw error;
  }
}
