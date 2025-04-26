import React from 'react';
import { useTheme } from '../../basic/ThemeProvider';
import CompanyHeader from '../Landing/CompanyHeader';
import CyclicWaveBackground from '../../basic/CyclicWaveBackground';
import { endConfig, startConfig } from '../Landing/HeroSection/waveConfigs';
import ThemeSwitcher from '../../basic/ThemeSwitcher';
import './styles.css';

/**
 * NextGenLanding Component
 * A modern landing page with smooth vertical scrolling sections
 * Built on top of the original Landing styles
 */
const NextGenLanding: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const companyName = process.env.REACT_APP_COMPANY_NAME || 'TrueMetry';

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
            companyName={companyName}
            tag_line_word_1="Entertainment"
            tag_line_word_2="Evolved"
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

      {/* Additional sections will be added here */}
      <div className="next-gen-sections">
        <section id="features" className="next-gen-section">
          <h2>Features</h2>
          {/* Features content will be added here */}
        </section>

        <section id="contact" className="next-gen-section">
          <h2>Contact Us</h2>
          {/* Contact form will be added here */}
        </section>
      </div>
    </>
  );
};

export default NextGenLanding; 