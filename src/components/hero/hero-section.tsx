'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const t = useTranslations('Hero');
  const router = useRouter();

  return (
    <section className="hero-section relative overflow-hidden py-8 md:py-10">
      <div className="hero-accent" aria-hidden="true">
        <span className="hero-accent__glow" />
        <span className="hero-accent__line hero-accent__line--1" />
        <span className="hero-accent__line hero-accent__line--2" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1e3a8a] leading-tight">
            {t('title')}
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-6 py-5"
              onClick={() => router.push('/dc/login')}
            >
              {t('signInButton')}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-5"
              onClick={() => router.push('/dc/login')}
            >
              {t('registerButton')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
