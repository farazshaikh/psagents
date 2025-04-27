import React from 'react';
import { useTheme } from '../../basic/ThemeProvider';
import CompanyHeader from '../Landing/CompanyHeader';
import CyclicWaveBackground from '../../basic/CyclicWaveBackground';
import { endConfig, startConfig } from '../Landing/HeroSection/waveConfigs';
import ThemeSwitcher from '../../basic/ThemeSwitcher';
import { landingPageContent } from '../../../content/landing';
import ProductsSection from './ProductsSection';
import './styles.css';

/**
 * NextGenLanding Component
 * A modern landing page with smooth vertical scrolling sections
 * Built on top of the original Landing styles
 */
const LandingWithSections: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { companyHeader, productsSection } = landingPageContent;

  return (
    <>
      <div className="theme-switcher-wrapper">
        <ThemeSwitcher isDark={isDark} onToggle={toggleTheme} />
      </div>

      {/* Hero Section - Using Landing styles */}
      <div className="landing">
        <nav className="landing-nav">
          {/* Navigation content will go here */}
        </nav>

        <div className="landing-content">
          <CompanyHeader
            companyName={companyHeader.companyName}
            tag_line_word_1={companyHeader.tagLine.word1}
            tag_line_word_2={companyHeader.tagLine.word2}
          />
          <button className="cta-button">Get Started</button>
        </div>

        <div className="landing-wave-section">
          <CyclicWaveBackground
            startConfig={startConfig}
            endConfig={endConfig}
            cycleConfig={{
              cycleDuration: 20000,     // 20 seconds per cycle
              startWaitTime: 0.00,      // 0.6% brief pause at start
              endWaitTime: 0.00,        // 0.5% brief pause at end
              transitionTime: 0.495     // 45% each transition (9s × 2 = 18s)
            }}
          />
        </div>
      </div>

      {/* Products Section */}
      <ProductsSection content={productsSection} />
    </>
  );
};

export default LandingWithSections;