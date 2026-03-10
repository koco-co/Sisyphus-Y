import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function useAuthSession() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const remember = useAuthStore((state) => state.remember);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!hasHydrated) {
      hydrate();
    }
  }, [hasHydrated, hydrate]);

  return {
    token,
    user,
    remember,
    hasHydrated,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };
}
