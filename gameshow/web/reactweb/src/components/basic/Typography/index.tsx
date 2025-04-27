/**
 * Typography Component
 * 
 * A foundational component for text presentation that handles:
 * - Text hierarchy (h1-h6, body, etc.)
 * - Font styling (size, weight, line height, etc.)
 * - Text alignment and transforms
 * 
 * Colors are handled by the theme system, not this component.
 * The color prop simply connects to theme variables.
 */

import React, { ElementType } from 'react';
import { useTheme } from '../ThemeProvider';
import './styles.css';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  /** The typographic hierarchy variant to use */
  variant?: 'display1' | 'display2' | 'display3' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption' | 'overline';
  
  /** Override the HTML element used */
  component?: ElementType;
  
  /** Theme-based color to use. Maps to theme.colors.fg.* values */
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse';
  
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
  
  /** Add bottom margin */
  gutterBottom?: boolean;
  
  /** Prevent text wrapping */
  noWrap?: boolean;
  
  /** Additional CSS classes */
  className?: string;

  /** Children elements */
  children: React.ReactNode;
}

const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  component,
  color = 'primary',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
  className = '',
  children,
  ...props
}) => {
  const { theme } = useTheme();
  const Component = component || getDefaultComponent(variant);
  
  const style = {
    color: theme.colors.fg[color],
    ...(props.style || {})
  };
  
  const classes = [
    'typography',
    `typography-${variant}`,
    `align-${align}`,
    gutterBottom ? 'gutter-bottom' : '',
    noWrap ? 'no-wrap' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={classes} style={style} {...props}>
      {children}
    </Component>
  );
};

const getDefaultComponent = (variant: TypographyProps['variant']): ElementType => {
  switch (variant) {
    case 'display1':
    case 'display2':
    case 'display3':
      return 'h1';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return variant;
    case 'subtitle1':
    case 'subtitle2':
      return 'h6';
    case 'body1':
    case 'body2':
      return 'p';
    case 'caption':
    case 'overline':
      return 'span';
    default:
      return 'p';
  }
};

export default Typography; 