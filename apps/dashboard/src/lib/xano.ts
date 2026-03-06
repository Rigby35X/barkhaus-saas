export * from '@barkhaus/xano-client';
import { configure } from '@barkhaus/xano-client';
configure({ baseUrl: import.meta.env.VITE_XANO_BASE_URL });

import axios from 'axios';

const xanoClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Animals (PAWS / dogs for org 9)
const xanoAnimals = axios.create({
  baseURL: import.meta.env.VITE_XANO_ANIMALS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:Od874PbA',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_XANO_ANIMALS_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'}`,
  },
});

export const fetchPawsAnimals = async (params: { org?: number; status?: string }) => {
  const q = new URLSearchParams();
  if (params.org) q.append('org', params.org.toString());
  if (params.status) q.append('status', params.status);
  const response = await xanoAnimals.get(`/dogs?${q.toString()}`);
  const data = response.data;
  return { animals: Array.isArray(data) ? data : data?.animals || [] };
};

export const fetchPawsAnimalById = async (id: number) => {
  const response = await xanoAnimals.get(`/dogs/${id}`);
  return response.data;
};

export const createPawsAnimal = async (data: any) => {
  const response = await xanoAnimals.post('/dogs', data);
  return response.data;
};

export const updatePawsAnimal = async (id: number, data: any) => {
  const response = await xanoAnimals.patch(`/dogs/${id}`, data);
  return response.data;
};

export const deletePawsAnimal = async (id: number) => {
  const response = await xanoAnimals.delete(`/dogs/${id}`);
  return response.data;
};

export const sendPawsEmail = async (animalId: number, templateName: string) => {
  const response = await xanoAnimals.post(`/dogs/${animalId}/send_email`, { template_name: templateName });
  return response.data;
};

// Website content
const xanoContent = axios.create({
  baseURL: import.meta.env.VITE_XANO_CONTENT_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:MU8UozDK',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_XANO_CONTENT_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'}`,
  },
});

export const fetchAllWebsiteContent = async (orgId: number) => {
  const response = await xanoContent.get(`/website_content/${orgId}?id=1`);
  return response.data as any[];
};

export const updateWebsiteSection = async (sectionId: number, content: Record<string, any>) => {
  const response = await xanoContent.patch(`/website_content/${sectionId}`, {
    ...content,
    updated_at: new Date().toISOString(),
  });
  return response.data;
};

export const fetchOrganizationBySlug = async (slug: string) => {
  const url = `${import.meta.env.VITE_XANO_ORGANIZATIONS_URL}/organizations?slug=${slug}`;
  const response = await xanoClient.get(url);
  return response.data[0] || null;
};

export const fetchOrganizationById = async (id: number) => {
  const url = `${import.meta.env.VITE_XANO_ORGANIZATIONS_URL}/organizations/${id}`;
  const response = await xanoClient.get(url);
  return response.data;
};

export const fetchAnimalsByOrg = async (orgId: number) => {
  const url = `${import.meta.env.VITE_XANO_ANIMALS_URL}/animals?organization_id=${orgId}`;
  const response = await xanoClient.get(url);
  return response.data;
};

export const fetchFormSubmissions = async (params: {
  org_id: number;
  form_type?: 'contact' | 'waitlist';
  status?: 'new' | 'read' | 'replied' | 'archived';
  limit?: number;
  offset?: number;
}) => {
  // TODO: Update with actual form_submissions API URL after Xano deployment
  const baseUrl = import.meta.env.VITE_XANO_FORM_SUBMISSIONS_URL ||
                  `${import.meta.env.VITE_XANO_BASE_URL}/form_submissions`;

  const queryParams = new URLSearchParams();
  queryParams.append('org_id', params.org_id.toString()); // Required for security
  if (params?.form_type) queryParams.append('form_type', params.form_type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const url = `${baseUrl}?${queryParams.toString()}`;
  const response = await xanoClient.get(url);
  return response.data;
};

export const updateFormSubmissionStatus = async (id: number, status: string, adminNotes?: string) => {
  // TODO: Create PATCH endpoint in Xano for updating submission status
  const baseUrl = import.meta.env.VITE_XANO_FORM_SUBMISSIONS_URL ||
                  `${import.meta.env.VITE_XANO_BASE_URL}/form_submissions`;

  const url = `${baseUrl}/${id}`;
  const response = await xanoClient.patch(url, { status, admin_notes: adminNotes });
  return response.data;
};

export default xanoClient;
