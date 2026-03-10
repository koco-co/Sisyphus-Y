import { create } from 'zustand';

const AUTH_STORAGE_KEY = 'sisyphus-auth';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  full_name?: string | null;
}

interface StoredAuthSession {
  token: string;
  user: AuthUser;
  remember: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  remember: boolean;
  hasHydrated: boolean;
  hydrate: () => void;
  login: (token: string, user: AuthUser, remember?: boolean) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

function readStorage(storage: Storage | null): StoredAuthSession | null {
  if (!storage) return null;
  const raw = storage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return { local: null, session: null };
  }

  return {
    local: window.localStorage,
    session: window.sessionStorage,
  };
}

function persistSession(session: StoredAuthSession) {
  const { local, session: sessionStorage } = getBrowserStorage();
  if (!local || !sessionStorage) return;

  if (session.remember) {
    local.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  local.removeItem(AUTH_STORAGE_KEY);
}

function clearPersistedSession() {
  const { local, session } = getBrowserStorage();
  local?.removeItem(AUTH_STORAGE_KEY);
  session?.removeItem(AUTH_STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  remember: true,
  hasHydrated: false,
  hydrate: () => {
    const { local, session } = getBrowserStorage();
    const stored = readStorage(session) ?? readStorage(local);

    set({
      token: stored?.token ?? null,
      user: stored?.user ?? null,
      remember: stored?.remember ?? true,
      hasHydrated: true,
    });
  },
  login: (token, user, remember = true) => {
    persistSession({ token, user, remember });
    set({ token, user, remember, hasHydrated: true });
  },
  logout: () => {
    clearPersistedSession();
    set({ token: null, user: null, remember: true, hasHydrated: true });
  },
  isAuthenticated: () => !!get().token,
}));
