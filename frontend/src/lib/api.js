import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hoa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hoa_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Typed API calls ──────────────────────────────────────────────────────────

export const authAPI = {
  login:  (email, password) => api.post('/api/auth/login', { email, password }),
  logout: ()               => api.post('/api/auth/logout'),
  me:     ()               => api.get('/api/auth/me'),
};

export const communityAPI = {
  list:      ()   => api.get('/api/communities'),
  get:       (id) => api.get(`/api/communities/${id}`),
  dashboard: (id) => api.get(`/api/communities/${id}/dashboard`),
  create:    (data) => api.post('/api/communities', data),
};

export const duesAPI = {
  delinquent:    (communityId) => api.get(`/api/dues/delinquent?community=${communityId}`),
  payments:      (communityId) => api.get(`/api/dues/payments?community=${communityId}`),
  recordPayment: (data)        => api.post('/api/dues/payment', data),
  sendReminder:  (accountId)   => api.post(`/api/dues/${accountId}/reminder`),
  sendAllReminders: (communityId) => api.post('/api/dues/reminders/all', { communityId }),
};

export const complianceAPI = {
  alerts:   (state)       => api.get(`/api/compliance?state=${state}`),
  calendar: ()            => api.get('/api/compliance/calendar'),
  acknowledge: (alertId)  => api.post(`/api/compliance/${alertId}/acknowledge`),
};

export const violationsAPI = {
  list:   (communityId) => api.get(`/api/violations?community=${communityId}`),
  create: (data)        => api.post('/api/violations', data),
  update: (id, data)    => api.put(`/api/violations/${id}`, data),
  sendNotice: (id)      => api.post(`/api/violations/${id}/notice`),
};

export const maintenanceAPI = {
  list:   (communityId) => api.get(`/api/maintenance?community=${communityId}`),
  create: (data)        => api.post('/api/maintenance', data),
  update: (id, data)    => api.put(`/api/maintenance/${id}`, data),
};

export const vendorAPI = {
  list:   (communityId) => api.get(`/api/vendors?community=${communityId}`),
  get:    (id)          => api.get(`/api/vendors/${id}`),
  create: (data)        => api.post('/api/vendors', data),
  update: (id, data)    => api.put(`/api/vendors/${id}`, data),
};

export const residentAPI = {
  list:   (communityId) => api.get(`/api/residents?community=${communityId}`),
  get:    (id)          => api.get(`/api/residents/${id}`),
  create: (data)        => api.post('/api/residents', data),
  update: (id, data)    => api.put(`/api/residents/${id}`, data),
  invite: (id)          => api.post(`/api/residents/${id}/invite`),
};

export const documentAPI = {
  list:   (communityId) => api.get(`/api/documents?community=${communityId}`),
  upload: (formData)    => api.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id)          => api.delete(`/api/documents/${id}`),
};

export const communicationsAPI = {
  send:    (data) => api.post('/api/communications/send', data),
  history: (communityId) => api.get(`/api/communications?community=${communityId}`),
};

export const accountingAPI = {
  summary:  (communityId) => api.get(`/api/accounting/summary?community=${communityId}`),
  expenses: (communityId, month) => api.get(`/api/accounting/expenses?community=${communityId}&month=${month}`),
  history:  (communityId) => api.get(`/api/accounting/history?community=${communityId}`),
};

export const taxAPI = {
  documents: (communityId) => api.get(`/api/tax?community=${communityId}`),
  download:  (docId)       => api.get(`/api/tax/${docId}/download`, { responseType: 'blob' }),
};
