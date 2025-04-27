import React, { forwardRef, useMemo } from 'react';
import { useTheme } from '../ThemeProvider';
import './styles.css';

export interface MButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'solid' | 'soft' | 'glass' | 'outline' | 'ghost';

  /** Theme-based color to use */
  color?: 'primary' | 'secondary' | 'error';

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Make the button take full width */
  fullWidth?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Icon to show before text */
  startIcon?: React.ReactNode;

  /** Icon to show after text */
  endIcon?: React.ReactNode;

  /** Convert button to anchor tag */
  href?: string;
}

interface ButtonCustomProperties extends React.CSSProperties {
  '--button-bg': string;
  '--button-hover-bg': string;
  '--button-active-bg': string;
  '--button-border-color': string;
  '--button-text-color': string;
  '--button-shadow': string;
  '--button-hover-shadow': string;
  '--button-gradient': string;
}

export const MButton = forwardRef<HTMLButtonElement, MButtonProps>(({
  variant = 'solid',
  color = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  startIcon,
  endIcon,
  children,
  href,
  onClick,
  ...props
}, ref) => {
  const { theme } = useTheme();

  const buttonStyles = useMemo(() => {
    const styles: ButtonCustomProperties = {
      '--button-bg': theme.colors.bg.secondary,
      '--button-hover-bg': theme.colors.bg.tertiary,
      '--button-active-bg': theme.colors.bg.primary,
      '--button-border-color': theme.colors.border.light,
      '--button-text-color': theme.colors.fg.primary,
      '--button-shadow': theme.effects.shadow.sm,
      '--button-hover-shadow': theme.effects.shadow.md,
      '--button-gradient': theme.colors.gradients.primary,
    };

    // Apply variant styles using CSS custom properties
    if (variant === 'solid') {
      styles['--button-bg'] = theme.buttons[color].background;
      styles['--button-hover-bg'] = theme.buttons[color].hover;
      styles['--button-active-bg'] = theme.buttons[color].active;
      styles['--button-text-color'] = theme.buttons[color].text;
    } else if (variant === 'soft') {
      styles['--button-bg'] = `${theme.buttons[color].background}1a`; // 10% opacity
      styles['--button-hover-bg'] = `${theme.buttons[color].hover}33`; // 20% opacity
      styles['--button-active-bg'] = `${theme.buttons[color].active}26`; // 15% opacity
      styles['--button-text-color'] = theme.buttons[color].background;
    } else if (variant === 'glass') {
      styles['--button-bg'] = `${theme.buttons[color].background}33`; // 20% opacity
      styles['--button-hover-bg'] = `${theme.buttons[color].hover}40`; // 25% opacity
      styles['--button-active-bg'] = `${theme.buttons[color].active}26`; // 15% opacity
      styles['--button-text-color'] = theme.buttons[color].background;
      styles['--button-border-color'] = `${theme.buttons[color].background}1a`; // 10% opacity
      styles.backdropFilter = theme.effects.frostedGlass.blur;
    } else if (variant === 'outline') {
      styles['--button-hover-bg'] = `${theme.buttons[color].background}0a`; // 4% opacity
      styles['--button-active-bg'] = `${theme.buttons[color].background}14`; // 8% opacity
      styles['--button-border-color'] = `${theme.buttons[color].background}66`; // 40% opacity
      styles['--button-text-color'] = theme.buttons[color].background;
    } else if (variant === 'ghost') {
      styles['--button-hover-bg'] = `${theme.buttons[color].background}0a`; // 4% opacity
      styles['--button-active-bg'] = `${theme.buttons[color].background}14`; // 8% opacity
      styles['--button-text-color'] = theme.buttons[color].background;
    }

    if (disabled) {
      styles.opacity = theme.buttons.disabled.opacity.toString();
      styles.cursor = 'not-allowed';
      styles.backdropFilter = 'none';
    }

    return styles;
  }, [theme, variant, color, disabled]);

  const buttonClasses = [
    'mbutton',
    `mbutton--${variant}`,
    `mbutton--${size}`,
    fullWidth && 'mbutton--full-width',
    loading && 'mbutton--loading',
    disabled && 'mbutton--disabled',
    className
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && <span className="mbutton__loader" />}
      <span className="mbutton__content">
        {startIcon && <span className="mbutton__icon mbutton__icon--start">{startIcon}</span>}
        {children}
        {endIcon && <span className="mbutton__icon mbutton__icon--end">{endIcon}</span>}
      </span>
    </>
  );

  const commonProps = {
    className: buttonClasses,
    style: buttonStyles,
    disabled: disabled || loading,
    onClick: disabled || loading ? undefined : onClick,
    ref,
    ...props
  };

  if (href && !disabled && !loading) {
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
}); 