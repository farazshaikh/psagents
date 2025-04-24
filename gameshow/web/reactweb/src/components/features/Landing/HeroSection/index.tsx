import React from 'react';
import Button from '../../../basic/Button';
import Typography from '../../../basic/Typography';
import WaveBackground from '../../../basic/WaveBackground';
import './styles.css';

interface HeroSectionProps {
  title?: string;
  description?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title = "Transform Your Content with AI",
  description = "Create engaging, interactive content experiences powered by artificial intelligence. Turn your ideas into immersive stories.",
  ctaText = "Get Started",
  onCtaClick
}) => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <Typography variant="h1" className="hero-title">
          {title}
        </Typography>
        <Typography variant="body1" className="hero-description">
          {description}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={onCtaClick}
          className="hero-cta"
        >
          {ctaText}
        </Button>
      </div>
      <div className="hero-visual">
        {/* Add hero image or animation here */}
      </div>
      <WaveBackground panel={true}/>
    </section>
  );
};

export default HeroSection;