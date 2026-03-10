import axios from 'axios';
import { getCached, setCached } from './apiCache';

// ─── Xano clients ───────────────────────────────────────────────────────────

const xanoAnimals = axios.create({
  baseURL: import.meta.env.VITE_XANO_ANIMALS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:Od874PbA',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_XANO_ANIMALS_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'}`,
  },
});

const xanoContent = axios.create({
  baseURL: import.meta.env.VITE_XANO_CONTENT_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:MU8UozDK',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_XANO_CONTENT_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'}`,
  },
});

const xanoBase = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

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

/** For org 9 – hits PAWS Xano directly */
export async function fetchAnimalsOrg9(status?: string): Promise<Animal[]> {
  const cacheKey = `animals_org9_${status ?? 'all'}`;
  const cached = getCached<Animal[]>(cacheKey);
  if (cached) return cached;

  const q = new URLSearchParams({ org: '9' });
  if (status) q.append('status', status);
  const res = await xanoAnimals.get<Animal[] | { animals: Animal[] }>(`/dogs?${q}`);
  const data = res.data;
  const result = Array.isArray(data) ? data : data?.animals ?? [];
  setCached(cacheKey, result);
  return result;
}

/** For other orgs – hits Xano orgs API */
export async function fetchAnimals(orgId: number): Promise<Animal[]> {
  if (orgId === 9) return fetchAnimalsOrg9();

  const cacheKey = `animals_org_${orgId}`;
  const cached = getCached<Animal[]>(cacheKey);
  if (cached) return cached;

  const url = `${import.meta.env.VITE_XANO_ANIMALS_URL}/animals?organization_id=${orgId}`;
  const res = await xanoBase.get<Animal[]>(url);
  const result = Array.isArray(res.data) ? res.data : [];
  setCached(cacheKey, result);
  return result;
}

export async function fetchAnimalById(id: number): Promise<Animal> {
  const res = await xanoAnimals.get<Animal>(`/dogs/${id}`);
  return res.data;
}

export async function createAnimal(data: Partial<Animal>): Promise<Animal> {
  const res = await xanoAnimals.post<Animal>('/dogs', data);
  return res.data;
}

export async function updateAnimal(id: number, data: Partial<Animal>): Promise<Animal> {
  const res = await xanoAnimals.patch<Animal>(`/dogs/${id}`, data);
  return res.data;
}

export async function deleteAnimal(id: number): Promise<void> {
  await xanoAnimals.delete(`/dogs/${id}`);
}

export async function sendAnimalEmail(animalId: number, templateName: string): Promise<{ confirmation_message?: string }> {
  const res = await xanoAnimals.post<{ confirmation_message?: string }>(`/dogs/${animalId}/send_email`, { template_name: templateName });
  return res.data;
}

// ─── Image upload ─────────────────────────────────────────────────────────────

export async function uploadImage(file: File, orgId: number, section = 'animals'): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  form.append('section', section);
  form.append('orgId', String(orgId));

  const res = await fetch('/api/upload-image', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Image upload failed');
  const json = await res.json() as { success: boolean; imageUrl?: string; error?: string };
  if (!json.success) throw new Error(json.error ?? 'Upload failed');
  return json.imageUrl ?? '';
}

// ─── Website content ──────────────────────────────────────────────────────────

export async function fetchWebsiteContent(orgId: number): Promise<WebsiteSection[]> {
  const res = await xanoContent.get<WebsiteSection[]>(`/website_content/${orgId}?id=1`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateWebsiteSection(sectionId: number, content: Record<string, unknown>): Promise<WebsiteSection> {
  const res = await xanoContent.patch<WebsiteSection>(`/website_content/${sectionId}`, {
    ...content,
    updated_at: new Date().toISOString(),
  });
  return res.data;
}

// ─── Organization ─────────────────────────────────────────────────────────────

export async function fetchOrganizationById(orgId: number): Promise<Record<string, unknown> | null> {
  try {
    const url = `${import.meta.env.VITE_XANO_ORGANIZATIONS_URL}/organizations/${orgId}`;
    const res = await xanoBase.get<Record<string, unknown>>(url);
    return res.data;
  } catch {
    return null;
  }
}

// ─── Applications (form submissions) ─────────────────────────────────────────

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

export async function fetchApplications(params: {
  org_id: number;
  form_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Application[]> {
  const baseUrl =
    import.meta.env.VITE_XANO_FORM_SUBMISSIONS_URL ||
    `${import.meta.env.VITE_XANO_BASE_URL}/form_submissions`;

  const q = new URLSearchParams({ org_id: String(params.org_id) });
  if (params.form_type) q.append('form_type', params.form_type);
  if (params.status) q.append('status', params.status);
  if (params.limit) q.append('limit', String(params.limit));
  if (params.offset) q.append('offset', String(params.offset));

  const res = await xanoBase.get<Application[]>(`${baseUrl}?${q}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateApplicationStatus(id: number, status: string, adminNotes?: string): Promise<Application> {
  const baseUrl =
    import.meta.env.VITE_XANO_FORM_SUBMISSIONS_URL ||
    `${import.meta.env.VITE_XANO_BASE_URL}/form_submissions`;

  const res = await xanoBase.patch<Application>(`${baseUrl}/${id}`, { status, admin_notes: adminNotes });
  return res.data;
}
