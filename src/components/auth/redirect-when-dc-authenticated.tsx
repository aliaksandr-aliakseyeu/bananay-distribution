'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useDcAuthStore } from '@/lib/stores/dc-auth-store';

export function RedirectWhenDcAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useDcAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated) {
      router.replace('/dc/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated) return null;
  if (isAuthenticated) return null;
  return <>{children}</>;
}
