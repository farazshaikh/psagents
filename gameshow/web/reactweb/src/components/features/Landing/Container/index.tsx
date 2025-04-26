import React from 'react';
import { useTheme } from '../../../basic/ThemeProvider';
import { ContainerProps } from './types';
import './styles.css';

/**
 * Container component for NextGenLanding
 * Provides a smooth scrolling container for vertical sections
 */
const Container: React.FC<ContainerProps> = ({ children, className = '' }) => {
  const { theme } = useTheme();
  
  return (
    <div 
      className={`next-gen-container ${className}`}
      style={{
        backgroundColor: theme.colors.bg.primary,
        color: theme.colors.fg.primary,
      }}
    >
      <div className="next-gen-content">
        {children}
      </div>
    </div>
  );
};

export default Container; 