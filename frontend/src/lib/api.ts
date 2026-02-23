import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  login: (email: string, name?: string) =>
    api.post('/api/auth/login', { email, name }),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
};

export const escrowApi = {
  create: (data: any) =>
    api.post('/api/escrow/create', data),
  get: (escrowId: string) =>
    api.get(`/api/escrow/${escrowId}`),
  list: () => api.get('/api/escrow'),
  acknowledge: (escrowId: string) =>
    api.post(`/api/escrow/${escrowId}/acknowledge`),
  uploadVerification: (escrowId: string, data: any) =>
    api.post(`/api/escrow/${escrowId}/upload-verification`, data),
};

export const disputeApi = {
  raise: (escrowId: string, data: any) =>
    api.post(`/api/dispute/${escrowId}/raise`, data),
  get: (disputeId: string) =>
    api.get(`/api/dispute/${disputeId}`),
  resolve: (disputeId: string, data: any) =>
    api.post(`/api/dispute/${disputeId}/resolve`, data),
};

export const userApi = {
  profile: () => api.get('/api/user/profile'),
  stats: () => api.get('/api/user/stats'),
};

export default api;
