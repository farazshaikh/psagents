import React from 'react';
import { useTheme } from '../../basic/ThemeProvider';
import CompanyHeader from '../Landing/CompanyHeader';
import CyclicWaveBackground from '../../basic/CyclicWaveBackground';
import { endConfig, startConfig } from '../Landing/HeroSection/waveConfigs';
import ThemeSwitcher from '../../basic/ThemeSwitcher';
import { landingPageContent } from '../../../content/landing';
import ProductsSection from './ProductsSection';
import { MButton } from '../../basic/MButton';
import Typography from '../../basic/Typography';
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

      {/* Hero Section with Wave Background */}
      <div className="hero-section">
        {/* Wave Container */}
        <div className="wave-container">
          <div className="wave-section">
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

        {/* Company Header Section */}
        <div className="header-section">
          <CompanyHeader
            companyName={companyHeader.companyName}
            tag_line_word_1={companyHeader.tagLine.word1}
            tag_line_word_2={companyHeader.tagLine.word2}
          />
          <MButton 
            variant="glass"
            color="primary"
            size="lg"
            className="hero-cta"
            startIcon={<span>✨</span>}
          >
            <Typography variant="h3">
              Get Started
            </Typography>
          </MButton>
        </div>
        {/* Products Section */}
        <ProductsSection content={productsSection} />
      </div>
    </>
  );
};

export default LandingWithSections;