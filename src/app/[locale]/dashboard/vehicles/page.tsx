'use client';

import { useTranslations } from 'next-intl';
import { RequireDriverAuth } from '@/components/auth/require-driver-auth';
import { BackButton } from '@/components/ui/back-button';
import { VehiclesBlock } from '@/components/onboarding/vehicles-block';

export default function DashboardVehiclesPage() {
  const t = useTranslations('Dashboard');
  const tOnboarding = useTranslations('Onboarding');

  return (
    <RequireDriverAuth>
      <div className="w-full flex-1 flex flex-col min-h-0 bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 mb-6">
            <BackButton href="/dashboard">{tOnboarding('back')}</BackButton>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('vehiclesCard')}</h1>
              <p className="text-sm text-gray-600 mt-1">{t('vehiclesCardDescription')}</p>
            </div>
          </div>
          <VehiclesBlock />
        </div>
      </div>
    </RequireDriverAuth>
  );
}
