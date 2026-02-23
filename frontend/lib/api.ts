import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const authAPI = {
  me: () => api.get('/api/auth/me'),
  login: (username: string) => api.post('/api/auth/login', { username }),
  logout: () => api.post('/api/auth/logout'),
};

export const escrowAPI = {
  create: (data: any) => api.post('/api/escrows', data),
  get: (id: string) => api.get(`/api/escrows/${id}`),
  list: (role?: string) => api.get('/api/escrows', { params: { role } }),
  acknowledge: (id: string) => api.post(`/api/escrows/${id}/acknowledge`),
  scan: (id: string, video: File) => {
    const formData = new FormData();
    formData.append('video', video);
    return api.post(`/api/escrows/${id}/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  unbox: (id: string, video: File) => {
    const formData = new FormData();
    formData.append('video', video);
    return api.post(`/api/escrows/${id}/unbox`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const disputeAPI = {
  create: (escrowId: string, reason: string, evidence?: File) => {
    const formData = new FormData();
    formData.append('escrowId', escrowId);
    formData.append('reason', reason);
    if (evidence) formData.append('evidence', evidence);
    return api.post('/api/disputes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  get: (id: string) => api.get(`/api/disputes/${id}`),
  proposeDeduction: (id: string, amount: number) =>
    api.post(`/api/disputes/${id}/propose-deduction`, { proposedDeduction: amount }),
  respondDeduction: (id: string, accepted: boolean, counterOffer?: number) =>
    api.post(`/api/disputes/${id}/respond-deduction`, { accepted, counterOffer }),
};

export default api;
