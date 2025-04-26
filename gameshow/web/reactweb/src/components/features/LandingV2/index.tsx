import React from 'react';
import CyclicWaveBackground from '../../basic/CyclicWaveBackground';
import { endConfig, startConfig } from '../Landing/HeroSection/waveConfigs';
import CompanyHeader from '../Landing/CompanyHeader';

/**
 * LandingV2 Page Component
 * 
 * Vertically scrollable landing page with:
 * - Wave animation section
 * - Company header
 * - Content section
 */
export const LandingV2: React.FC = () => {
  const companyName = process.env.REACT_APP_COMPANY_NAME || 'TrueMetry';
  
  return (
    <div style={{ 
      background: 'black', 
      color: 'white', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Wave section */}
      <div style={{ 
        width: '100%',
        height: '50vh',
        position: 'relative'
      }}>
        <CyclicWaveBackground
          startConfig={startConfig}
          endConfig={endConfig}
          cycleConfig={{
            cycleDuration: 20000,
            startWaitTime: 0.00,
            endWaitTime: 0.00,
            transitionTime: 0.495
          }}
        />
      </div>

      {/* Content section */}
      <div style={{ 
        flex: 1,
        padding: '2rem'
      }}>
        <CompanyHeader
          companyName={companyName}
          tag_line_word_1="Entertainment"
          tag_line_word_2="Evolved"
        />

        {[...Array(250)].map((_, i) => (
          <React.Fragment key={i}>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
            <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default LandingV2; 