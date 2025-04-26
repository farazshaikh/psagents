import { Theme } from './types';

export const darkTheme: Theme = {
  colors: {
    bg: {
      primary: 'rgba(0, 0, 0, 1)',
      secondary: 'rgba(18, 18, 18, 1)',
      tertiary: 'rgba(38, 38, 38, 1)',
      overlay: 'rgba(0, 0, 0, 0.8)'
    },
    fg: {
      primary: 'rgba(255, 255, 255, 1)',
      secondary: 'rgba(168, 168, 168, 1)',
      tertiary: 'rgba(115, 115, 115, 1)',
      inverse: 'rgba(0, 0, 0, 1)'
    },
    accent: {
      primary: 'rgba(88, 81, 219, 1)',
      secondary: 'rgba(64, 93, 230, 1)',
      success: 'rgba(88, 195, 34, 1)',
      error: 'rgba(237, 73, 86, 1)',
      warning: 'rgba(255, 164, 26, 1)'
    },
    border: {
      light: 'rgba(38, 38, 38, 1)',
      medium: 'rgba(54, 54, 54, 1)',
      heavy: 'rgba(74, 74, 74, 1)'
    },
    gradients: {
      primary: 'linear-gradient(45deg, rgba(88, 81, 219, 1), rgba(64, 93, 230, 1))',
      surface: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 100%)',
      accent: 'linear-gradient(135deg, rgba(64, 93, 230, 1), rgba(88, 81, 219, 1), rgba(119, 68, 255, 1))'
    },
    overlay: {
      light: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.2)',
      heavy: 'rgba(255, 255, 255, 0.4)'
    }
  },
  typography: {
    // SF Pro Display for Apple devices, Segoe UI for Windows, Roboto for Android
    fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: {
      xs: '0.75rem',     // 12px - Small labels, metadata
      sm: '0.875rem',    // 14px - Secondary text, captions
      md: '1rem',        // 16px - Body text
      lg: '1.125rem',    // 18px - Large body text
      xl: '1.5rem',      // 24px - Section headings
      '2xl': '2rem',     // 32px - Page titles
      '3xl': '2.5rem',   // 40px - Hero text
      '4xl': '3rem'      // 48px - Large display text
    },
    fontWeight: {
      light: 300,        // Light text
      regular: 400,      // Regular body text
      medium: 500,       // Medium emphasis
      semibold: 600,     // High emphasis
      bold: 700         // Maximum emphasis
    },
    lineHeight: {
      none: 1,          // Headings
      tight: 1.25,      // Compact text
      snug: 1.375,      // Slightly compact
      normal: 1.5,      // Body text
      relaxed: 1.625,   // Relaxed body text
      loose: 2          // Very relaxed
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em'
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem'    // 48px
  },
  buttons: {
    primary: {
      background: 'rgba(0, 149, 246, 1)',
      text: 'rgba(255, 255, 255, 1)',
      hover: 'rgba(24, 119, 242, 1)',
      active: 'rgba(0, 116, 204, 1)'
    },
    secondary: {
      background: 'rgba(0, 0, 0, 1)',
      text: 'rgba(255, 255, 255, 1)',
      hover: 'rgba(26, 26, 26, 1)',
      active: 'rgba(44, 44, 44, 1)'
    },
    error: {
      background: 'rgba(237, 73, 86, 1)',
      text: 'rgba(255, 255, 255, 1)',
      hover: 'rgba(220, 45, 60, 1)',
      active: 'rgba(201, 28, 45, 1)'
    },
    disabled: {
      opacity: 0.3
    },
    borderRadius: '8px',
    transition: 'all 0.2s ease-in-out'
  },
  effects: {
    frostedGlass: {
      background: 'rgba(0, 0, 0, 0.8)',
      blur: '10px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    gradient: {
      primary: 'linear-gradient(45deg, rgba(0, 149, 246, 1), rgba(88, 81, 219, 1))',
      dark: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 100%)',
      evolved: 'linear-gradient(135deg, rgba(64, 93, 230, 1) 0%, rgba(225, 48, 108, 1) 50%, rgba(252, 175, 69, 1) 100%)'
    },
    shadow: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.5)'
    }
  }
};