import React from 'react';
import { useTheme } from '../ThemeProvider';
import './styles.css';

type BaseButtonProps = {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
  size?: 'small' | 'medium' | 'large';
  effect?: 'frosted' | 'gradient';
  fullWidth?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  component?: React.ElementType;
  children?: React.ReactNode;
};

export type ButtonProps = BaseButtonProps & (
  | (Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> & { href?: never })
  | (Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> & { href: string })
);

export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  effect,
  fullWidth = false,
  iconStart,
  iconEnd,
  component: Component = 'button',
  className = '',
  style: propStyle = {},
  children,
  ...props
}) => {
  const { theme } = useTheme();
  
  const buttonStyle = React.useMemo(() => {
    const baseStyle = {
      borderRadius: theme.buttons.borderRadius,
      transition: theme.buttons.transition,
      ...(fullWidth && { width: '100%' }),
    };

    if (variant === 'contained') {
      return {
        ...baseStyle,
        backgroundColor: theme.buttons.variants.contained.background,
        color: theme.buttons.variants.contained.color,
        '&:hover': {
          backgroundColor: theme.buttons.variants.contained.hover,
        },
        '&:active': {
          backgroundColor: theme.buttons.variants.contained.active,
        },
      };
    }

    if (variant === 'outlined') {
      return {
        ...baseStyle,
        border: theme.buttons.variants.outlined.border,
        color: theme.buttons.variants.outlined.color,
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: theme.buttons.variants.outlined.hover,
        },
      };
    }

    // text variant
    return {
      ...baseStyle,
      backgroundColor: 'transparent',
      color: theme.buttons.variants.text.color,
      '&:hover': {
        backgroundColor: theme.buttons.variants.text.hover,
      },
    };
  }, [theme, variant, fullWidth]);

  const classes = [
    'btn',
    `btn-${variant}`,
    color !== 'primary' && `btn-${color}`,
    size !== 'medium' && `btn-${size}`,
    effect && `btn-effect-${effect}`,
    fullWidth && 'btn-full-width',
    (iconStart || iconEnd) && 'btn-icon',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {iconStart && <span className="btn-icon-start">{iconStart}</span>}
      {children}
      {iconEnd && <span className="btn-icon-end">{iconEnd}</span>}
    </>
  );

  const finalStyle = {
    ...buttonStyle,
    ...propStyle,
  };

  if ('href' in props) {
    return (
      <a className={classes} style={finalStyle} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }

  return (
    <Component 
      className={classes} 
      style={finalStyle}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </Component>
  );
}; 