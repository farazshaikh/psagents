import React from 'react';
import './styles.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
  size?: 'small' | 'medium' | 'large';
  effect?: 'solid' | 'frosted' | 'gradient';
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  effect = 'solid',
  fullWidth = false,
  startIcon,
  endIcon,
  className = '',
  children,
  ...props
}) => {
  const buttonClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${color}`,
    `btn-${size}`,
    `btn-effect-${effect}`,
    fullWidth ? 'btn-full-width' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={buttonClasses} {...props}>
      {startIcon && <span className="btn-icon btn-icon-start">{startIcon}</span>}
      {children}
      {endIcon && <span className="btn-icon btn-icon-end">{endIcon}</span>}
    </button>
  );
};

export default Button; 