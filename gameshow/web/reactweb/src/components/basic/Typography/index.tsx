import React, { ElementType } from 'react';
import './styles.css';

export interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption' | 'overline';
  component?: ElementType;
  color?: 'primary' | 'secondary' | 'error' | 'text' | 'textSecondary';
  align?: 'left' | 'center' | 'right' | 'justify';
  gutterBottom?: boolean;
  noWrap?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  component,
  color = 'text',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
  className = '',
  children,
  ...props
}) => {
  const Component = component || getDefaultComponent(variant);
  
  const classes = [
    'typography',
    `typography-${variant}`,
    `color-${color}`,
    `align-${align}`,
    gutterBottom ? 'gutter-bottom' : '',
    noWrap ? 'no-wrap' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

const getDefaultComponent = (variant: TypographyProps['variant']): ElementType => {
  switch (variant) {
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