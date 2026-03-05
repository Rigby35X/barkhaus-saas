let _baseUrl = '';
let _token = '';

/**
 * Configure the Xano client.
 * Call this at app startup before using any API functions.
 * @param {Object} options
 * @param {string} options.baseUrl - The Xano API base URL (e.g. from import.meta.env.VITE_XANO_BASE_URL)
 */
function configure({ baseUrl }) {
  _baseUrl = baseUrl.replace(/\/$/, '');
}

/**
 * Set the auth token for authenticated requests.
 * @param {string|null} token
 */
function setToken(token) {
  _token = token || '';
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  const res = await fetch(`${_baseUrl}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Organizations ---

async function getOrg(slug) {
  return request(`/organizations?slug=${encodeURIComponent(slug)}`).then(
    (data) => (Array.isArray(data) ? data[0] || null : data)
  );
}

async function getOrgById(id) {
  return request(`/organizations/${id}`);
}

// --- Animals ---

async function getAnimals(orgId) {
  return request(`/animals?organization_id=${orgId}`);
}

async function getAnimal(id) {
  return request(`/animals/${id}`);
}

async function createAnimal(orgId, data) {
  return request('/animals', {
    method: 'POST',
    body: JSON.stringify({ organization_id: orgId, ...data }),
  });
}

async function updateAnimal(id, data) {
  return request(`/animals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function deleteAnimal(id) {
  return request(`/animals/${id}`, { method: 'DELETE' });
}

// --- Applications ---

async function getApplications(orgId) {
  return request(`/applications?organization_id=${orgId}`);
}

async function createApplication(orgId, data) {
  return request('/applications', {
    method: 'POST',
    body: JSON.stringify({ organization_id: orgId, ...data }),
  });
}

async function updateApplication(id, data) {
  return request(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// --- Auth ---

async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function getMe(token) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- Form Submissions ---

async function getFormSubmissions(params) {
  const q = new URLSearchParams();
  q.append('org_id', String(params.org_id));
  if (params.form_type) q.append('form_type', params.form_type);
  if (params.status) q.append('status', params.status);
  if (params.limit) q.append('limit', String(params.limit));
  if (params.offset) q.append('offset', String(params.offset));
  return request(`/form_submissions?${q.toString()}`);
}

async function updateFormSubmission(id, status, adminNotes) {
  return request(`/form_submissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, admin_notes: adminNotes }),
  });
}

module.exports = {
  configure,
  setToken,
  getOrg,
  getOrgById,
  getAnimals,
  getAnimal,
  createAnimal,
  updateAnimal,
  deleteAnimal,
  getApplications,
  createApplication,
  updateApplication,
  login,
  getMe,
  getFormSubmissions,
  updateFormSubmission,
};
