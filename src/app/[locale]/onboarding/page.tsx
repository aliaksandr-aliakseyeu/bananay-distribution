'use client';

import { RequireDriverAuth } from '@/components/auth/require-driver-auth';
import { OnboardingContent } from '@/components/onboarding/onboarding-content';

export default function OnboardingPage() {
  return (
    <RequireDriverAuth>
      <div className="min-h-screen bg-gray-50">
        <OnboardingContent showBackButton={true} />
      </div>
    </RequireDriverAuth>
  );
}
