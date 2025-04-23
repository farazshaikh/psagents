import React from 'react';
import './styles.css';

interface HeroSectionProps {
  backgroundType: 'image' | 'video';
  backgroundSrc: string;
  companyName?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  backgroundType,
  backgroundSrc,
  companyName = 'TrueM'
}) => {
  return (
    <section className="hero-section">
      {backgroundType === 'video' ? (
        <video 
          className="hero-background"
          autoPlay 
          muted 
          loop 
          playsInline
        >
          <source src={backgroundSrc} type="video/mp4" />
        </video>
      ) : (
        <div 
          className="hero-background"
          style={{ backgroundImage: `url(${backgroundSrc})` }}
        />
      )}
      
      <div className="hero-content">
        <h1 className="company-name">{companyName}</h1>
      </div>
    </section>
  );
}; 