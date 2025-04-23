import React from 'react';
import './styles.css';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesSectionProps {
  features: Feature[];
  sectionTitle?: string;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  features,
  sectionTitle = 'Why Choose Us'
}) => {
  return (
    <section className="features-section">
      <div className="features-container">
        <h2 className="features-title">{sectionTitle}</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <img src={feature.icon} alt={feature.title} />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 