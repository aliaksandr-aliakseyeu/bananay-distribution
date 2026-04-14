import { RedirectWhenDcAuthenticated } from '@/components/auth/redirect-when-dc-authenticated';
import { DistributionFinalCtaSection } from '@/components/landing/distribution-final-cta-section';
import { DistributionHowItWorksSection } from '@/components/landing/distribution-how-it-works-section';
import { DistributionLandingHero } from '@/components/landing/distribution-landing-hero';
import { DistributionWhyJoinSection } from '@/components/landing/distribution-why-join-section';
import { LandingDivider } from '@/components/landing/landing-divider';

export default function HomePage() {
  return (
    <RedirectWhenDcAuthenticated>
      <div className="page-shell">
        <DistributionLandingHero />
        <LandingDivider />
        <DistributionHowItWorksSection />
        <LandingDivider />
        <DistributionWhyJoinSection />
        <LandingDivider tone="slate" />
        <DistributionFinalCtaSection />
      </div>
    </RedirectWhenDcAuthenticated>
  );
}
