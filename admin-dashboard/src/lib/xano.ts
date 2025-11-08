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

export default xanoClient;
