'use client';

import { useDcGuestRedirectStatus } from './use-dc-guest-redirect-status';

export function RedirectWhenDcAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useDcGuestRedirectStatus();
  if (isLoading) return null;
  if (isAuthenticated) return null;
  return <>{children}</>;
}
