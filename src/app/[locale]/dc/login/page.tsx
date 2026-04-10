'use client';

import { useEffect } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useDcAuthStore } from '@/lib/stores/dc-auth-store';
import { DcLoginForm } from '@/components/auth/dc-login-form';

export default function DcLoginPage() {
  const t = useTranslations('DcLoginPage');
  const tAuth = useTranslations('Auth.dc');
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useDcAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated) router.replace('/dashboard');
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-xl w-full mx-4 rounded-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <p className="mb-2 text-[14px] font-semibold uppercase tracking-[0.28em] text-[#7f93ba]">
            {t('title')}
          </p>
          <h1 className="text-4xl font-bold leading-[0.95] text-[#2b418f]">
            {t('subtitle')}
          </h1>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{tAuth('title')}</h2>
          <p className="text-[15px] text-gray-600 mb-6">{tAuth('description')}</p>
          <DcLoginForm />
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="text-[15px] text-gray-600 hover:text-gray-900">
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
