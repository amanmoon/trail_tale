// src/app/page.tsx
import React from 'react';
import HeroSection from '@/component/heroSection/heroSection';
import CoreOfferSection from '@/component/coreOfferingSection/coreOfferSection';
import VisualShowcaseSection from '@/component/visualShocaseSection/visualShowcaseSection';
import BenefitsSection from '@/component/benifitsSection/benefitsSection';
import Footer from '@/component/footer/footer';
import Navbar from '@/component/navbar/navbar';

const LandingPage: React.FC = () => {
  return (
    <>
      <Navbar />
      <HeroSection />
      <CoreOfferSection />
      <VisualShowcaseSection />
      <BenefitsSection />
      <Footer />
    </>
  );
};

export default LandingPage;