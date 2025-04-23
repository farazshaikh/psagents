import React from 'react';
import './styles.css';

export const Landing: React.FC = () => {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="container">
          {/* Hero content will go here */}
        </div>
      </section>

      <section className="landing-products">
        <div className="container">
          {/* Products showcase will go here */}
        </div>
      </section>
    </div>
  );
};

export default Landing;