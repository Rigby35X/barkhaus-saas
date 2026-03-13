import { supabase } from './supabase';
import { getCached, setCached } from './apiCache';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Animal {
  id: number;
  name: string;
  species?: string;
  breed?: string;
  age?: string | number;
  gender?: string;
  size?: string;
  weight?: string;
  status: string;
  intake_date?: string;
  adoption_fee?: number;
  description?: string;
  image_url?: string;
  additional_image_1?: string | { url?: string } | null;
  additional_image_2?: string | { url?: string } | null;
  additional_image_3?: string | { url?: string } | null;
  additional_image_4?: string | { url?: string } | null;
  special_needs?: boolean | string;
  good_with_kids?: boolean;
  good_with_cats?: boolean;
  good_with_dogs?: boolean;
  spayed_neutered?: boolean;
  vaccinated?: boolean;
  microchip?: boolean;
  org_id?: number;
  // MBPR (org 9) fields
  mbpr_internal_id?: string;
  estimated_adoption_date?: string;
  new_name?: string;
  acquired_from?: string;
  acquired_from_original_name?: string;
  acquired_from_shelter_id?: string;
  foster_name?: string;
  foster_contact?: string;
  birthday_estimated?: boolean;
  breed_primary?: string;
  breed_secondary?: string;
  breed_third?: string;
  markings_color?: string;
  markings_coat?: string;
  markings_eye_color?: string;
  grooming?: string;
  temperament?: string;
  orphan_or_mother?: string;
  mother_name?: string;
  youtube_video_url?: string;
  new_owner_photo?: { url?: string } | null;
  // PAWS fields
  Code?: string;
  [key: string]: unknown;
}

export interface OrgConfig {
  name: string;
  accessCode: string;
  logo: string;
  colors: { primary: string; secondary: string };
  contact: { email: string; phone: string; address: string };
  social: { facebook: string; instagram: string; twitter: string };
  isAdmin?: boolean;
  siteUrl?: string;
  subdomain?: string;
}

export interface WebsiteSection {
  id: number;
  section_key?: string;
  section?: string;
  title?: string;
  content?: string;
  subtitle?: string;
  button_text?: string;
  button_url?: string;
  image_url?: string;
  [key: string]: unknown;
}

export interface Application {
  id: number;
  org_id: number;
  form_type: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  admin_notes?: string;
  created_at?: string;
  form_data?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

/** Returns Authorization Bearer header if JWT token is present */
export function getAuthHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('barkhausAuthToken');
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // localStorage may not be available in SSR
  }
  return {};
}

// ─── Org configs ─────────────────────────────────────────────────────────────

export const ORGANIZATIONS: Record<number, OrgConfig> = {
  3: {
    name: 'Happy Paws Dog Rescue',
    accessCode: 'demo123',
    logo: '/assets/svgs/happy-paws.svg',
    colors: { primary: '#059669', secondary: '#6b7280' },
    contact: { email: 'info@happypaws.org', phone: '(555) 123-4567', address: '123 Rescue Lane, Pet City' },
    social: { facebook: 'https://facebook.com/happypaws', instagram: 'https://instagram.com/happypaws', twitter: 'https://twitter.com/happypaws' },
  },
  4: {
    name: 'Furry Friends Sanctuary',
    accessCode: 'furry456',
    logo: '/assets/svgs/furry-friends.svg',
    colors: { primary: '#7c3aed', secondary: '#a855f7' },
    contact: { email: 'hello@furryfriends.org', phone: '(555) 234-5678', address: '456 Animal Ave, Sanctuary City' },
    social: { facebook: 'https://facebook.com/furryfriends', instagram: 'https://instagram.com/furryfriends', twitter: '' },
  },
  5: {
    name: 'Paws & Hearts Rescue',
    accessCode: 'hearts789',
    logo: '/assets/svgs/paws-hearts.svg',
    colors: { primary: '#dc2626', secondary: '#ef4444' },
    contact: { email: 'contact@pawshearts.org', phone: '(555) 345-6789', address: '789 Heart Street, Love City' },
    social: { facebook: '', instagram: '', twitter: '' },
  },
  6: {
    name: 'Second Chance Animal Rescue',
    accessCode: 'second123',
    logo: '/assets/svgs/second-chance.svg',
    colors: { primary: '#0891b2', secondary: '#06b6d4' },
    contact: { email: 'info@secondchance.org', phone: '(555) 456-7890', address: '321 Hope Boulevard, Chance City' },
    social: { facebook: '', instagram: '', twitter: '' },
  },
  7: {
    name: 'Loving Tails Foundation',
    accessCode: 'tails456',
    logo: '/assets/svgs/loving-tails.svg',
    colors: { primary: '#ea580c', secondary: '#fb923c' },
    contact: { email: 'support@lovingtails.org', phone: '(555) 567-8901', address: '654 Tail Way, Foundation City' },
    social: { facebook: '', instagram: '', twitter: '' },
  },
  8: {
    name: 'Barkhaus Admin',
    accessCode: 'barkhaus2024',
    logo: '/assets/svgs/barkhaus.svg',
    colors: { primary: '#1f2937', secondary: '#374151' },
    contact: { email: 'admin@barkhaus.com', phone: '(555) 678-9012', address: '987 Admin Plaza, Control City' },
    social: { facebook: '', instagram: '', twitter: '' },
    isAdmin: true,
  },
  9: {
    name: 'Mission Bay Puppy Rescue',
    accessCode: 'mbpr2024',
    logo: '/assets/images/MBPR-Dark.png',
    colors: { primary: '#16a34a', secondary: '#22c55e' },
    contact: { email: 'admin@mbpr.org', phone: '(619) 555-PUPS', address: '456 Mission Bay Drive, San Diego, CA 92109' },
    social: { facebook: 'https://facebook.com/missionbaypuppyrescue', instagram: 'https://instagram.com/missionbaypuppyrescue', twitter: '' },
    siteUrl: 'https://missionbaypuppyrescue.org',
    subdomain: 'mbpr',
  },
  10: {
    name: 'MB Pups',
    accessCode: 'mbpups2024',
    logo: '/assets/images/MBPR-Dark.png',
    colors: { primary: '#16a34a', secondary: '#22c55e' },
    contact: { email: 'admin@mbpups.org', phone: '(619) 555-PUPS', address: '456 Mission Bay Drive, San Diego, CA 92109' },
    social: { facebook: '', instagram: '', twitter: '' },
  },
};

// ─── Animals ─────────────────────────────────────────────────────────────────

export async function getAnimals(orgId: number, status?: string): Promise<Animal[]> {
  console.log('[getAnimals] orgId:', orgId, '| type:', typeof orgId, '| status:', status ?? 'all');

  const cacheKey = `animals_org_${orgId}_${status ?? 'all'}`;
  const cached = getCached<Animal[]>(cacheKey);
  if (cached) {
    console.log('[getAnimals] returning cached result, count:', cached.length);
    return cached;
  }

  let query = supabase.from('animals').select('*').eq('org_id', orgId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  console.log('[getAnimals] supabase response — data count:', data?.length ?? 0, '| error:', error);
  if (error) throw error;
  const result = data ?? [];
  setCached(cacheKey, result);
  return result;
}

/** Backwards-compat alias */
export async function fetchAnimals(orgId: number): Promise<Animal[]> {
  return getAnimals(orgId);
}

export async function getAnimalById(id: number): Promise<Animal> {
  const { data, error } = await supabase.from('animals').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createAnimal(data: Partial<Animal>): Promise<Animal> {
  const { data: result, error } = await supabase.from('animals').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateAnimal(id: number, data: Partial<Animal>): Promise<Animal> {
  const { data: result, error } = await supabase
    .from('animals')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteAnimal(id: number, orgId?: number): Promise<void> {
  let query = supabase.from('animals').delete().eq('id', id);
  if (orgId) query = query.eq('org_id', orgId);
  const { error } = await query;
  if (error) throw error;
}

export async function sendAnimalEmail(animalId: number, templateName: string): Promise<{ confirmation_message?: string }> {
  const res = await fetch(`/api/animals/${animalId}/send_email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_name: templateName }),
  });
  if (!res.ok) throw new Error('Email send failed');
  return res.json() as Promise<{ confirmation_message?: string }>;
}

// ─── Image upload ─────────────────────────────────────────────────────────────

export async function uploadImage(file: File, orgId: number, section = 'animals'): Promise<string> {
  // NOTE: animal-images bucket must exist in Supabase Storage and be set to PUBLIC.
  // Go to Supabase → Storage → New bucket → animal-images → Public
  const org = ORGANIZATIONS[orgId];
  const subdomain = org?.subdomain ?? 'mbpr';
  const tenantUrl = `https://${subdomain}.preview.barkhaus.io/api/upload-image`;

  const form = new FormData();
  form.append('image', file);
  form.append('section', section);
  form.append('orgId', String(orgId));

  console.log(`Starting upload for org ${orgId}, section: ${section}, endpoint: ${tenantUrl}`);
  const res = await fetch(tenantUrl, { method: 'POST', body: form });

  if (!res.ok) {
    const text = await res.text();
    console.error('Upload failed:', res.status, text);
    throw new Error(`Image upload failed: ${res.status}`);
  }

  const json = await res.json() as { success?: boolean; url?: string; error?: string };
  console.log('Upload response:', json);

  if (json.url) return json.url;
  if (!json.success) throw new Error(json.error ?? 'Upload failed');
  return json.url ?? '';
}

// ─── Website content ──────────────────────────────────────────────────────────

export async function getWebsiteContent(orgId: number, pageSlug?: string): Promise<WebsiteSection[]> {
  let query = supabase.from('website_content').select('*').eq('org_id', orgId);
  if (pageSlug) query = query.eq('page_slug', pageSlug);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Backwards-compat alias */
export async function fetchWebsiteContent(orgId: number): Promise<WebsiteSection[]> {
  return getWebsiteContent(orgId);
}

export async function saveWebsiteContentSection(
  orgId: number,
  pageSlug: string,
  sectionKey: string,
  content: Record<string, unknown>,
): Promise<WebsiteSection> {
  console.log('[saveWebsiteContentSection] upserting', { orgId, pageSlug, sectionKey, content });
  const { data, error } = await supabase
    .from('website_content')
    .upsert(
      { org_id: orgId, page_slug: pageSlug, section_key: sectionKey, ...content, updated_at: new Date().toISOString() },
      { onConflict: 'org_id,page_slug,section_key' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWebsiteSection(sectionId: number, content: Record<string, unknown>): Promise<WebsiteSection> {
  const { data, error } = await supabase
    .from('website_content')
    .update({ ...content, updated_at: new Date().toISOString() })
    .eq('id', sectionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Organization ─────────────────────────────────────────────────────────────

export async function getOrganization(orgId: number): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  if (error) return null;
  return data;
}

/** Backwards-compat alias */
export async function fetchOrganizationById(orgId: number): Promise<Record<string, unknown> | null> {
  return getOrganization(orgId);
}

export async function updateOrganization(orgId: number, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOrganizationBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

// ─── Branding ─────────────────────────────────────────────────────────────────

export async function getBranding(orgId: number): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.from('branding').select('*').eq('org_id', orgId).single();
  if (error) return null;
  return data;
}

export async function saveBranding(orgId: number, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('branding')
    .upsert({ org_id: orgId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Applications / Form Submissions ─────────────────────────────────────────

export async function getApplications(orgId: number): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateApplication(id: number, updates: Partial<Application>): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFormSubmissions(orgId: number): Promise<Application[]> {
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateFormSubmission(id: number, updates: Partial<Application>): Promise<Application> {
  const { data, error } = await supabase
    .from('form_submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchApplications(params: {
  org_id: number;
  form_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Application[]> {
  let query = supabase
    .from('form_submissions')
    .select('*')
    .eq('org_id', params.org_id)
    .order('created_at', { ascending: false });
  if (params.form_type) query = query.eq('form_type', params.form_type);
  if (params.status) query = query.eq('status', params.status);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset && params.limit) query = query.range(params.offset, params.offset + params.limit - 1);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateApplicationStatus(id: number, status: string, adminNotes?: string): Promise<Application> {
  return updateFormSubmission(id, { status, admin_notes: adminNotes });
}


// ─── Policies ────────────────────────────────────────────────────────────────

export async function ensurePoliciesTable() {
  // This table must exist — run this in Supabase SQL Editor if policies tab errors:
  // CREATE TABLE IF NOT EXISTS policies (
  //   id bigserial PRIMARY KEY,
  //   org_id integer NOT NULL,
  //   policy_type text NOT NULL,
  //   content text,
  //   updated_at timestamptz DEFAULT now(),
  //   UNIQUE (org_id, policy_type)
  // );
}
