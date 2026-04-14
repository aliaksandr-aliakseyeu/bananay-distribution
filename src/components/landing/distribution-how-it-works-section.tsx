'use client';

import { useTranslations } from 'next-intl';
import { SectionHeading } from './section-heading';

const steps = [1, 2, 3] as const;

export function DistributionHowItWorksSection() {
  const t = useTranslations('HowItWorks');

  return (
    <section className="bg-white">
      <div className="section-container py-8 lg:py-10">
        <SectionHeading
          label={t('label')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-3 lg:gap-16">
          {steps.map((step, index) => (
            <div
              key={step}
              className={index === 0 ? 'pt-1' : 'pt-1 lg:border-l lg:border-slate-200 lg:pl-10'}
            >
              <div className="text-5xl font-extrabold tracking-tight text-blue-700">
                {String(step).padStart(2, '0')}
              </div>
              <h3 className="mt-7 text-2xl font-bold tracking-tight text-slate-950">
                {t(`step${step}Title`)}
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {t(`step${step}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
