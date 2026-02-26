import axios, { AxiosInstance } from 'axios';
import type { User } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request / Response types ───────────────────────────────────────────────

export interface CreateEscrowRequest {
  itemName: string;
  itemValue: number;
  itemDescription?: string;
  platformSource?: string;
  listingUrl?: string;
  expectedDeliveryWindow?: string;
}

export interface CreateEscrowResponse {
  escrowId: string;
  state: string;
  buyerDeposit: number;
  platformFee: number;
  sellerReceives: number;
  shareLink: string;
}

export interface UploadVerificationRequest {
  verificationType: 'SELLER_LIVENESS' | 'BUYER_UNBOXING';
  videoData: string;
}

export interface RaiseDisputeRequest {
  reason: string;
  disputeType?: string;
  evidenceJson?: Record<string, unknown>;
}

// ── API helpers ────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, name?: string) =>
    api.post<User>('/api/auth/login', { email, name }),
  logout: () => api.post<{ success: boolean }>('/api/auth/logout'),
  me: () => api.get<User>('/api/auth/me'),
};

export const escrowApi = {
  create: (data: CreateEscrowRequest) =>
    api.post<CreateEscrowResponse>('/api/escrow/create', data),
  get: (escrowId: string) =>
    api.get<Record<string, unknown>>(`/api/escrow/${escrowId}`),
  list: () =>
    api.get<Record<string, unknown>[]>('/api/escrow'),
  acknowledge: (escrowId: string) =>
    api.post<{ state: string }>(`/api/escrow/${escrowId}/acknowledge`),
  uploadVerification: (escrowId: string, data: UploadVerificationRequest) =>
    api.post<{ verificationId: string; videoPath: string; confidenceScore: number }>(
      `/api/escrow/${escrowId}/upload-verification`,
      data
    ),
};

export const disputeApi = {
  raise: (escrowId: string, data: RaiseDisputeRequest) =>
    api.post<{ disputeId: string }>(`/api/dispute/${escrowId}/raise`, data),
  get: (disputeId: string) =>
    api.get<Record<string, unknown>>(`/api/dispute/${disputeId}`),
  listForEscrow: (escrowId: string) =>
    api.get<Record<string, unknown>[]>(`/api/dispute/escrow/${escrowId}`),
  resolve: (disputeId: string, data: { resolutionText?: string; resolvedFor: 'BUYER' | 'SELLER' }) =>
    api.post<{ status: string; resolvedFor: string }>(`/api/dispute/${disputeId}/resolve`, data),
};

export const userApi = {
  profile: () => api.get<User>('/api/user/profile'),
  stats: () => api.get<{ escrows: Record<string, unknown>; scores: Record<string, unknown> }>('/api/user/stats'),
};

export default api;
