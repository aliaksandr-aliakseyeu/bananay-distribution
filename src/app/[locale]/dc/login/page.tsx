'use client';

import { useTranslations } from 'next-intl';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { DcLoginForm } from '@/components/auth/dc-login-form';
import { useDcGuestRedirectStatus } from '@/components/auth/use-dc-guest-redirect-status';

export default function DcLoginPage() {
  const t = useTranslations('DcLoginPage');
  const tAuth = useTranslations('Auth.dc');
  const { isLoading, isAuthenticated } = useDcGuestRedirectStatus();

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <AuthPageShell
      eyebrow={t('title')}
      title={t('subtitle')}
      heading={tAuth('title')}
      description={tAuth('description')}
      backLabel={t('backHome')}
    >
      <DcLoginForm />
    </AuthPageShell>
  );
}
