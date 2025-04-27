import React, { useMemo } from 'react';
import { useTheme } from '../ThemeProvider';
import Typography from '../Typography';
import './styles.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'contained' | 'outlined' | 'text' | 'glass';

  /** Theme-based color to use. Maps to theme.colors.accent.* values */
  color?: 'primary' | 'secondary' | 'error';

  /** Typography-based size variant */
  size?: 'small' | 'medium' | 'large';

  /** Make the button take full width */
  fullWidth?: boolean;

  /** Icon to show before text */
  iconStart?: React.ReactNode;

  /** Icon to show after text */
  iconEnd?: React.ReactNode;

  /** Convert button to anchor tag */
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  className = '',
  iconStart,
  iconEnd,
  children,
  href,
  onClick,
  ...props
}) => {
  const { theme } = useTheme();

  const buttonStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      backgroundColor: 'transparent',
      borderRadius: theme.buttons.borderRadius,
      transition: 'all 0.2s ease-in-out',
    };

    // Apply variant styles
    if (variant === 'contained') {
      styles.backgroundColor = `${theme.colors.accent[color]}e6`; // 90% opacity
      styles.color = theme.colors.fg.inverse;
      styles.backdropFilter = 'blur(8px)';
    } else if (variant === 'outlined') {
      styles.border = `2px solid ${theme.colors.accent[color]}`;
      styles.color = theme.colors.accent[color];
      styles.backgroundColor = `${theme.colors.accent[color]}14`; // 8% opacity
    } else if (variant === 'glass') {
      styles.backgroundColor = `${theme.colors.accent[color]}40`; // 25% opacity
      styles.backdropFilter = 'blur(8px)';
      styles.color = theme.colors.accent[color];
      styles.border = `1px solid ${theme.colors.accent[color]}33`;
    } else {
      styles.color = theme.colors.accent[color];
      styles.backgroundColor = `${theme.colors.accent[color]}0a`; // 4% opacity
    }

    // Apply disabled styles
    if (disabled) {
      styles.opacity = theme.buttons.disabled.opacity;
      styles.cursor = 'not-allowed';
      styles.backgroundColor = `${theme.colors.bg.tertiary}80`; // 50% opacity
      styles.color = theme.colors.fg.tertiary;
      styles.border = `1px solid ${theme.colors.border.light}`;
      styles.backdropFilter = 'none';
    }

    return styles;
  }, [theme, variant, color, disabled]);

  const buttonClasses = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    fullWidth && 'button--full-width',
    disabled && 'button--disabled',
    className
  ].filter(Boolean).join(' ');

  const commonProps = {
    className: buttonClasses,
    style: buttonStyles,
    disabled,
    onClick: disabled ? undefined : onClick,
    ...props
  };

  const content = (
    <Typography
      variant={size === 'small' ? 'body2' : 'body1'}
      component="span"
      className="button__content"
    >
      {iconStart && <span className="button__icon button__icon--start">{iconStart}</span>}
      {children}
      {iconEnd && <span className="button__icon button__icon--end">{iconEnd}</span>}
    </Typography>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        {...commonProps as React.AnchorHTMLAttributes<HTMLAnchorElement>}
      >
        {content}
      </a>
    );
  }

  return (
    <button {...commonProps}>
      {content}
    </button>
  );
};