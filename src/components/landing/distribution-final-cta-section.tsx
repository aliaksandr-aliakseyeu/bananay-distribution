'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export function DistributionFinalCtaSection() {
  const t = useTranslations('HomeCta');

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-12 text-center sm:px-6 lg:px-8 lg:pb-10 lg:pt-14">
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          {t('subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="landing">
            <Link href="/login">{t('buttonPrimary')}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="landing"
            className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          >
            <Link href="/login">{t('buttonSecondary')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
