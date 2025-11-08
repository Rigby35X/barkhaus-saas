export interface Organization {
  id: number;
  org: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  subdomain: string;
  custom_domain?: string;
  website: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_light_url?: string;
  mission_statement?: string;
}

export interface Animal {
  id: number;
  name: string;
  breed: string;
  age: string;
  gender: string;
  size: string;
  status: string;
  description?: string;
  image_url?: string;
  organization_id: number;
}

export interface TenantContext {
  slug: string;
  orgId: number;
  organization: Organization | null;
}
