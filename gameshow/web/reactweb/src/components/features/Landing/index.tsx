import React from 'react';
import HeroSection from './HeroSection';
import WaveBackground from '../../basic/WaveBackground';
import { startConfig } from './HeroSection/waveConfigs';
import './styles.css';

export const Landing: React.FC = () => {
  return (
    <div className="landing">
      <section className="landing-top-section">
        <div className="section-content">
          {/* Top section content */}
          <h1>Top Section</h1>
        </div>
      </section>

      <section className="landing-middle-section">
        <div className="section-content">
          {/* Middle section content */}
          <h1>Middle Section</h1>
        </div>
      </section>

      <section className="landing-bottom-section">
        <WaveBackground config={startConfig} />
      </section>
    </div>
  );
};

export default Landing;