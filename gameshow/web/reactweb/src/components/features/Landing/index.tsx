import React from 'react';
import HeroSection from './HeroSection';
import './styles.css';

export const Landing: React.FC = () => {
  return (
    <div className="landing">
      <HeroSection 
        title="Transform Your Content with AI"
        description="Create engaging, interactive content experiences powered by artificial intelligence. Turn your ideas into immersive stories."
        ctaText="Get Started"
        onCtaClick={() => console.log('CTA clicked')}
      />

      <section className="landing-products">
        <div className="container">
          {/* Products showcase will go here */}
        </div>
      </section>
    </div>
  );
};

export default Landing;