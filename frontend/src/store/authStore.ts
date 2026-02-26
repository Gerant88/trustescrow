import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  buyer_score: number;
  seller_score: number;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  /** True once the initial /api/auth/me check has completed (success or 401) */
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));
