'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirect: documents are now in profile (selfie + license) and STS per vehicle. */
export default function DashboardDocumentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/profile');
  }, [router]);
  return null;
}
