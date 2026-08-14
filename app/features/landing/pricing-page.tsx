import { useRef } from "react";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { useRevealOnView } from "./media";
import { FaqSection, PricingSection } from "./pricing-section";
import "./landing.css";

export function PricingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useRevealOnView(rootRef);

  return (
    <div
      ref={rootRef}
      className="landing-page relative min-h-dvh w-full overflow-x-clip bg-white text-[#4e4646]"
    >
      <SiteHeader />
      <main id="main">
        <PricingSection headingLevel="h1" />
        <FaqSection />
      </main>
      <SiteFooter />
    </div>
  );
}
