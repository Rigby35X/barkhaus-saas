/** Branch previews can target their isolated tenant API instead of production domains. */
export function tenantApiOrigin(subdomain: string): string {
  const override = import.meta.env.VITE_TENANT_API_ORIGIN;
  if (override) return new URL(override).origin;
  if (!/^[a-z0-9-]+$/i.test(subdomain)) throw new Error('Invalid organization website.');
  return `https://${subdomain}.preview.barkhaus.io`;
}
