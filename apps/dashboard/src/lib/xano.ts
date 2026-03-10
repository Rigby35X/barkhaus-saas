// Supabase migration: re-exports from api.ts for backwards compatibility
export {
  getAnimals as fetchAnimalsByOrg,
  getAnimalById as fetchPawsAnimalById,
  createAnimal as createPawsAnimal,
  updateAnimal as updatePawsAnimal,
  deleteAnimal as deletePawsAnimal,
  sendAnimalEmail as sendPawsEmail,
  fetchWebsiteContent as fetchAllWebsiteContent,
  updateWebsiteSection,
  fetchOrganizationBySlug,
  fetchOrganizationById,
  fetchApplications as fetchFormSubmissions,
  updateApplicationStatus as updateFormSubmissionStatus,
} from './api';

import { getAnimals } from './api';

export const fetchPawsAnimals = (params: { org?: number; status?: string }) =>
  getAnimals(params.org ?? 0, params.status).then((animals) => ({ animals }));
