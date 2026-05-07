import axios from 'axios';

const api = axios.create({
  baseURL: 'https://chakrazai-hoa-production.up.railway.app',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hoa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
  upload: (formData)    => api.post('/api/documents', formData),
  delete: (id)          => api.delete(`/api/documents/${id}`),
};
export const communicationsAPI = {
  send:    (data)        => api.post('/api/communications/send', data),
  history: (communityId) => api.get(`/api/communications?community=${communityId}`),
};
export const accountingAPI = {
  summary:  (communityId) => api.get(`/api/accounting/summary?community=${communityId}`),
  expenses: (communityId) => api.get(`/api/accounting/expenses?community=${communityId}`),
  history:  (communityId) => api.get(`/api/accounting/history?community=${communityId}`),
};
export const taxAPI = {
  documents: (communityId) => api.get(`/api/tax?community=${communityId}`),
  download:  (docId)       => api.get(`/api/tax/${docId}/download`, { responseType: 'blob' }),
};
export const electionsAPI = {
  list:            (communityId) => api.get(`/api/elections?community=${communityId}`),
  create:          (data)        => api.post('/api/elections', data),
  update:          (id, data)    => api.patch(`/api/elections/${id}`, data),
  addCandidate:    (id, data)    => api.post(`/api/elections/${id}/candidates`, data),
  updateCandidate: (id, cid, d)  => api.patch(`/api/elections/${id}/candidates/${cid}`, d),
  addAudit:        (id, data)    => api.post(`/api/elections/${id}/audit`, data),
  addNotice:       (id, data)    => api.post(`/api/elections/${id}/notices`, data),
  addReceipt:      (id, data)    => api.post(`/api/elections/${id}/receipts`, data),
};
