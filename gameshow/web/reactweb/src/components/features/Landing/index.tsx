import React from 'react';
import CyclicWaveBackground from '../../basic/CyclicWaveBackground';
import { endConfig, startConfig } from './HeroSection/waveConfigs';
import './styles.css';

/**
 * Landing Page Component
 * 
 * Layout structure:
 * - Navigation (10% viewport height, top)
 * - Centered Content (30% viewport height, center)
 *   - Company Name (animated fade in)
 *   - Tagline (split animation: "Entertainment" fades in, "Evolved" pulls in)
 *   - CTA Button
 * - Wave Background (70% viewport height, bottom)
 * 
 * The wave animation uses CyclicWaveBackground with a 20s cycle:
 * - Start State (0.12s, 0.6%): Minimal pause at initial state
 * - First Transition (9s, 45%): Smooth transition to end state
 * - End State (0.1s, 0.5%): Minimal pause at final state
 * - Second Transition (9s, 45%): Smooth transition back to start
 */
export const Landing: React.FC = () => {
  const companyName = process.env.REACT_APP_COMPANY_NAME || 'TrueMetry';
  
  return (
    <div className="landing">
      <nav className="landing-nav">
        {/* Navigation content will go here */}
      </nav>

      <div className="landing-content">
        <h1 className="company-name">{companyName}</h1>
        <h2 className="tagline">
          <span className="tagline-part">Entertainment</span>
          <span className="tagline-separator">, </span>
          <span className="tagline-evolved">Evolved</span>
          <span className="tagline-exclamation"> !</span>
        </h2>
        <button className="cta-button">Get Started</button>
      </div>

      <div className="landing-wave-section">
        <CyclicWaveBackground
          startConfig={startConfig}
          endConfig={endConfig}
          cycleConfig={{
            cycleDuration: 20000,     // 20 seconds per cycle
            startWaitTime: 0.00,     // 0.6% brief pause at start
            endWaitTime: 0.00,       // 0.5% brief pause at end
            transitionTime: 0.495      // 45% each transition (9s × 2 = 18s)
          }}
        />
      </div>
    </div>
  );
};

export default Landing;