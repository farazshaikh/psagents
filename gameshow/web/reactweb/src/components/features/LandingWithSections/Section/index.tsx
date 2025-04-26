import React from 'react';
import { useTheme } from '../../../basic/ThemeProvider';
import { SectionProps } from './types';
import './styles.css';

/**
 * Section component for NextGenLanding
 * Provides a consistent section layout with theme integration
 */
const Section: React.FC<SectionProps> = ({
  children,
  className = '',
  id,
  fullHeight = false,
  backgroundColor,
  textColor,
}) => {
  const { theme } = useTheme();

  return (
    <section
      id={id}
      className={`next-gen-section ${fullHeight ? 'full-height' : ''} ${className}`}
      style={{
        backgroundColor: backgroundColor || theme.colors.bg.secondary,
        color: textColor || theme.colors.fg.primary,
      }}
    >
      <div className="section-content">
        {children}
      </div>
    </section>
  );
};

export default Section; 