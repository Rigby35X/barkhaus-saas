import axios from 'axios';

const xanoClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const fetchFormSubmissions = async (params?: {
  form_type?: 'contact' | 'waitlist';
  status?: 'new' | 'read' | 'replied' | 'archived';
  limit?: number;
  offset?: number;
}) => {
  // TODO: Update with actual form_submissions API URL after Xano deployment
  const baseUrl = import.meta.env.VITE_XANO_FORM_SUBMISSIONS_URL ||
                  `${import.meta.env.VITE_XANO_BASE_URL}/form_submissions`;

  const queryParams = new URLSearchParams();
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
