import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchOrganizationBySlug } from '../lib/xano';
import type { TenantContext, Organization } from '../types';

export const useTenant = (): TenantContext & { loading: boolean; error: string | null } => {
  const location = useLocation();
  const [tenant, setTenant] = useState<TenantContext>({
    slug: '',
    orgId: 0,
    organization: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTenant = async () => {
      try {
        // Extract tenant slug from URL (e.g., /mbpr/dashboard -> mbpr)
        const pathParts = location.pathname.split('/').filter(Boolean);
        const slug = pathParts[0];

        if (!slug) {
          setError('No tenant slug in URL');
          setLoading(false);
          return;
        }

        console.log('🔍 Loading tenant:', slug);

        const org: Organization = await fetchOrganizationBySlug(slug);

        if (org) {
          setTenant({
            slug,
            orgId: org.id,
            organization: org,
          });
          console.log('✅ Tenant loaded:', org.org);
        } else {
          setError(`Organization not found: ${slug}`);
        }
      } catch (err) {
        console.error('❌ Error loading tenant:', err);
        setError('Failed to load organization');
      } finally {
        setLoading(false);
      }
    };

    loadTenant();
  }, [location.pathname]);

  return { ...tenant, loading, error };
};
