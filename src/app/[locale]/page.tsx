'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { HeroSection } from '@/components/hero/hero-section';
import { RedirectWhenDcAuthenticated } from '@/components/auth/redirect-when-dc-authenticated';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations('HowItWorks');
  const tWho = useTranslations('WhoCanBeHub');
  const tWhy = useTranslations('WhyJoinBananayHub');
  const tCta = useTranslations('HomeCta');
  const router = useRouter();

  return (
    <RedirectWhenDcAuthenticated>
      <div className="flex flex-col">
        <HeroSection />

        {/* Как это работает */}
        <section className="py-6 md:py-8 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a8a]">
                {t('title')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 md:[grid-template-columns:repeat(3,minmax(12rem,1fr))] gap-3 md:gap-4 w-max max-w-full mx-auto">
              <Card className="p-4 py-4 gap-2 shadow-sm border-gray-200 flex flex-col items-center text-center min-w-0 md:min-w-[12rem] max-w-[18rem] md:max-w-[16rem] mx-auto md:mx-0">
                <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                  <span className="text-[#f97316]">1 </span>{t('step1Title')}
                </h3>
                <div className="flex justify-center items-center my-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/box.png" alt="" className="w-[11rem] h-auto object-contain" />
                </div>
                <p className="text-gray-600 text-sm mt-0">{t('step1Desc')}</p>
              </Card>
              <Card className="p-4 py-4 gap-2 shadow-sm border-gray-200 flex flex-col items-center text-center min-w-0 md:min-w-[12rem] max-w-[18rem] md:max-w-[16rem] mx-auto md:mx-0">
                <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                  <span className="text-[#f97316]">2 </span>{t('step2Title')}
                </h3>
                <div className="flex justify-center items-center my-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/scan.png" alt="" className="w-[11rem] h-auto object-contain" />
                </div>
                <p className="text-gray-600 text-sm mt-0">{t('step2Desc')}</p>
              </Card>
              <Card className="p-4 py-4 gap-2 shadow-sm border-gray-200 flex flex-col items-center text-center min-w-0 md:min-w-[12rem] max-w-[18rem] md:max-w-[16rem] mx-auto md:mx-0">
                <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                  <span className="text-[#f97316]">3 </span>{t('step3Title')}
                </h3>
                <div className="flex justify-center items-center my-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/courier.png" alt="" className="w-[11rem] h-auto object-contain" />
                </div>
                <p className="text-gray-600 text-sm mt-0">{t('step3Desc')}</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Разделительная линия между блоками */}
        <div className="bg-gray-50 py-2" aria-hidden>
          <div className="max-w-3xl mx-auto px-4">
            <hr className="border-t border-gray-200" />
          </div>
        </div>

        {/* Кто может стать хабом */}
        <section className="py-6 md:py-8 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">
                <span className="text-[#1e3a8a]">{tWho('titlePrefix')}</span>
                <span className="text-[#f97316]">{tWho('titleHighlight')}</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 md:[grid-template-columns:repeat(3,minmax(12rem,1fr))] gap-3 md:gap-4 w-max max-w-full mx-auto">
              <Card className="p-4 md:p-5 gap-2 shadow-sm border-gray-200 flex flex-col items-start text-left min-w-0 md:min-w-[12rem] max-w-[18rem] md:max-w-[16rem] mx-auto md:mx-0">
                <div className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/room.png" alt="" className="w-12 h-12 shrink-0 object-contain mt-0.5" />
                  <h3 className="font-semibold text-[#1e3a8a] text-lg leading-tight pt-0.5">{tWho('card1Title')}</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{tWho('card1Desc')}</p>
              </Card>
              <Card className="p-4 md:p-5 gap-2 shadow-sm border-gray-200 flex flex-col items-start text-left min-w-0 md:min-w-[12rem] max-w-[18rem] md:max-w-[16rem] mx-auto md:mx-0">
                <div className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/internet.png" alt="" className="w-12 h-12 shrink-0 object-contain mt-0.5" />
                  <h3 className="font-semibold text-[#1e3a8a] text-lg leading-tight pt-0.5">{tWho('card2Title')}</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{tWho('card2Desc')}</p>
              </Card>
              <Card className="p-4 md:p-5 gap-2 shadow-sm border-gray-200 flex flex-col items-start text-left min-w-0 md:min-w-[12rem] max-w-[18rem] md:max-w-[16rem] mx-auto md:mx-0">
                <div className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/work.png" alt="" className="w-12 h-12 shrink-0 object-contain mt-0.5" />
                  <h3 className="font-semibold text-[#1e3a8a] text-lg leading-tight pt-0.5 min-w-0">{tWho('card3Title')}</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{tWho('card3Desc')}</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Разделительная линия перед блоком «Почему присоединиться» */}
        <div className="bg-gray-50 py-2" aria-hidden>
          <div className="max-w-3xl mx-auto px-4">
            <hr className="border-t border-gray-200" />
          </div>
        </div>

        {/* Почему стоит присоединиться к Bananay Hub */}
        <section className="py-8 md:py-10 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a8a] text-center mb-6">
              {tWhy('title')}
            </h2>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </span>
                <span className="font-medium text-gray-900">{tWhy('benefit1')}</span>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </span>
                <span className="font-medium text-gray-900">{tWhy('benefit2')}</span>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </span>
                <span className="font-medium text-gray-900">{tWhy('benefit3')}</span>
              </li>
            </ul>
            <div className="mt-8 text-center">
              <Button
                size="lg"
                className="bg-[#f97316] hover:bg-[#ea580c] text-white px-8 py-6 text-base"
                onClick={() => router.push('/dc/login')}
              >
                {tCta('button')}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </RedirectWhenDcAuthenticated>
  );
}
