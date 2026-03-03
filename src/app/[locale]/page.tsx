import { HeroSection } from '@/components/hero/hero-section';
import { RedirectWhenDcAuthenticated } from '@/components/auth/redirect-when-dc-authenticated';

export default function HomePage() {
  return (
    <RedirectWhenDcAuthenticated>
      <div className="flex flex-col">
        <HeroSection />
      </div>
    </RedirectWhenDcAuthenticated>
  );
}
