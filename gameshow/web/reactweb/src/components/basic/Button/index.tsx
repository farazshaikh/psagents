import React, { useMemo } from 'react';
import { useTheme } from '../ThemeProvider';
import './styles.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
  size?: 'small' | 'medium' | 'large';
  effect?: 'frosted' | 'gradient' | 'none';
  fullWidth?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  effect = 'none',
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
      color: theme.colors.fg.primary,
      borderRadius: theme.buttons.borderRadius,
      transition: theme.buttons.transition,
    };

    if (variant === 'contained') {
      if (color === 'primary') {
        styles.backgroundColor = theme.colors.accent.primary;
        styles.color = theme.colors.fg.inverse;
      } else if (color === 'secondary') {
        styles.backgroundColor = theme.colors.accent.secondary;
        styles.color = theme.colors.fg.inverse;
      } else if (color === 'error') {
        styles.backgroundColor = theme.colors.accent.error;
        styles.color = theme.colors.fg.inverse;
      }
    } else if (variant === 'outlined') {
      styles.border = `1px solid ${theme.colors.border.medium}`;
      styles.color = theme.colors.fg.primary;
    } else if (effect === 'gradient') {
      styles.background = theme.colors.gradients[color === 'primary' ? 'primary' : 'surface'];
      styles.color = theme.colors.fg.primary;
    }

    if (disabled) {
      styles.opacity = theme.buttons.disabled.opacity;
      styles.cursor = 'not-allowed';
      styles.backgroundColor = theme.colors.bg.tertiary;
      styles.color = theme.colors.fg.tertiary;
      styles.border = `1px solid ${theme.colors.border.light}`;
    }

    return styles;
  }, [theme, variant, color, effect, disabled]);

  const buttonClasses = [
    'button',
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
    <>
      {iconStart}
      {children}
      {iconEnd}
    </>
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