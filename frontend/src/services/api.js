import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// Payments API
export const paymentsAPI = {
  // Payment methods
  getPaymentMethods: () => api.get('/payments/methods'),
  addPaymentMethod: (data) => api.post('/payments/methods', data),
  updatePaymentMethod: (id, data) => api.put(`/payments/methods/${id}`, data),
  deletePaymentMethod: (id) => api.delete(`/payments/methods/${id}`),

  // Payment history and balance
  getPaymentHistory: (params = {}) => api.get('/payments/history', { params }),
  getBalance: () => api.get('/payments/balance'),
  
  // Make payments
  makePayment: (data) => api.post('/payments/pay', data),
  
  // Auto-pay settings
  getAutoPaySettings: () => api.get('/payments/autopay'),
  updateAutoPaySettings: (data) => api.post('/payments/autopay', data),
  
  // Admin/Manager functions
  getAllPayments: (params = {}) => api.get('/payments/all', { params }),
};

// Messages API
export const messagesAPI = {
  // Message threads
  getThreads: (params = {}) => api.get('/messages/threads', { params }),
  createThread: (formData) => api.post('/messages/threads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Thread messages
  getThreadMessages: (threadId, params = {}) => api.get(`/messages/threads/${threadId}/messages`, { params }),
  sendMessage: (threadId, formData) => api.post(`/messages/threads/${threadId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Thread management
  updateThread: (threadId, data) => api.put(`/messages/threads/${threadId}`, data),
  
  // Unread count
  getUnreadCount: () => api.get('/messages/unread-count'),
};

// Leases API
export const leasesAPI = {
  // Lease documents
  getLeaseDocuments: (params = {}) => api.get('/leases/documents', { params }),
  getLeaseDocument: (id) => api.get(`/leases/documents/${id}`),
  uploadDocument: (formData) => api.post('/leases/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Signature requests
  getSignatureRequests: (params = {}) => api.get('/leases/signatures', { params }),
  signDocument: (requestId, data) => api.post(`/leases/signatures/${requestId}/sign`, data),
  
  // Lease information
  getCurrentLease: (params = {}) => api.get('/leases/current', { params }),
  
  // Renewal requests
  requestRenewal: (data) => api.post('/leases/renewal-request', data),
};

// Maintenance API
export const maintenanceAPI = {
  // Get maintenance requests with filters
  getRequests: (params = {}) => api.get('/maintenance', { params }),
  
  // Get single maintenance request
  getRequest: (id) => api.get(`/maintenance/${id}`),
  
  // Create new maintenance request with files
  createRequest: (formData) => api.post('/maintenance', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // Update maintenance request
  updateRequest: (id, formData) => api.put(`/maintenance/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // Assign request to maintenance staff
  assignRequest: (id, data) => api.put(`/maintenance/${id}/assign`, data),
  
  // Rate completed request (tenant only)
  rateRequest: (id, data) => api.put(`/maintenance/${id}/rate`, data),
  
  // Get maintenance categories
  getCategories: () => api.get('/maintenance/categories'),
  
  // Dashboard stats
  getDashboardStats: (params = {}) => api.get('/maintenance/dashboard/stats', { params }),
  
  // Recent requests
  getRecentRequests: (params = {}) => api.get('/maintenance/dashboard/recent', { params }),
};

// Properties API
export const propertiesAPI = {
  getProperties: (params = {}) => api.get('/properties', { params }),
  getProperty: (id) => api.get(`/properties/${id}`),
  createProperty: (data) => api.post('/properties', data),
  updateProperty: (id, data) => api.put(`/properties/${id}`, data),
  deleteProperty: (id) => api.delete(`/properties/${id}`),
  getBuildings: (id) => api.get(`/properties/${id}/buildings`),
  createBuilding: (id, data) => api.post(`/properties/${id}/buildings`, data),
  getDashboard: (id) => api.get(`/properties/${id}/dashboard`),
};

// Units API
export const unitsAPI = {
  getUnitsByProperty: (propertyId, params = {}) => 
    api.get(`/units/property/${propertyId}`, { params }),
  getUnit: (id) => api.get(`/units/${id}`),
  createUnit: (data) => api.post('/units', data),
  updateUnit: (id, data) => api.put(`/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/units/${id}`),
  getMaintenanceHistory: (id, params = {}) => 
    api.get(`/units/${id}/maintenance`, { params }),
};

// Users API
export const usersAPI = {
  getUsers: (params = {}) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deactivateUser: (id) => api.delete(`/users/${id}`),
  getMaintenanceStaff: () => api.get('/users/roles/maintenance'),
  getUserProperties: (id) => api.get(`/users/${id}/properties`),
  assignToProperty: (id, data) => api.post(`/users/${id}/properties`, data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getPropertyDashboard: (propertyId) => api.get(`/dashboard/property/${propertyId}`),
  getMaintenanceDashboard: () => api.get('/dashboard/maintenance'),
  getTenantDashboard: () => api.get('/dashboard/tenant'),
};

export default api;