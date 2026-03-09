import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
  isAuthenticated: () => !!get().token,
}));
