'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

const PUBLIC_PATHS = ['/login', '/register'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const { token, hasHydrated } = useAuthSession();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (isPublic) {
      setChecked(true);
      return;
    }

    const isDev = process.env.NODE_ENV === 'development';
    if (!token && !isDev) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [hasHydrated, pathname, router, token]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
