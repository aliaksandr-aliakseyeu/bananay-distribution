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
      <div className="max-w-md w-full mx-4 bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-1">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{tAuth('title')}</h2>
          <p className="text-sm text-gray-600 mb-6">{tAuth('description')}</p>
          <DcLoginForm />
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
