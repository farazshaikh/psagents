import { Theme } from './types';

export const lightTheme: Theme = {
  colors: {
    bg: {
      primary: 'rgba(255, 255, 255, 1)',
      secondary: 'rgba(249, 249, 249, 1)',
      tertiary: 'rgba(242, 242, 242, 1)',
      overlay: 'rgba(255, 255, 255, 0.8)'
    },
    fg: {
      primary: 'rgba(38, 38, 38, 1)',
      secondary: 'rgba(142, 142, 142, 1)',
      tertiary: 'rgba(199, 199, 199, 1)',
      inverse: 'rgba(255, 255, 255, 1)'
    },
    accent: {
      primary: 'rgba(88, 81, 219, 1)',
      secondary: 'rgba(64, 93, 230, 1)',
      success: 'rgba(88, 195, 34, 1)',
      error: 'rgba(237, 73, 86, 1)',
      warning: 'rgba(255, 164, 26, 1)'
    },
    border: {
      light: 'rgba(219, 219, 219, 1)',
      medium: 'rgba(199, 199, 199, 1)',
      heavy: 'rgba(168, 168, 168, 1)'
    },
    gradients: {
      primary: 'linear-gradient(45deg, rgba(88, 81, 219, 1), rgba(64, 93, 230, 1))',
      surface: 'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 100%)',
      accent: 'linear-gradient(135deg, rgba(64, 93, 230, 1), rgba(88, 81, 219, 1), rgba(119, 68, 255, 1))'
    },
    overlay: {
      light: 'rgba(0, 0, 0, 0.1)',
      medium: 'rgba(0, 0, 0, 0.2)',
      heavy: 'rgba(0, 0, 0, 0.4)'
    }
  },
  buttons: {
    primary: {
      background: 'rgba(0, 149, 246, 1)',
      text: 'rgba(255, 255, 255, 1)',
      hover: 'rgba(24, 119, 242, 1)',
      active: 'rgba(0, 116, 204, 1)'
    },
    secondary: {
      background: 'rgba(255, 255, 255, 1)',
      text: 'rgba(0, 0, 0, 1)',
      hover: 'rgba(245, 245, 245, 1)',
      active: 'rgba(235, 235, 235, 1)'
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
      background: 'rgba(255, 255, 255, 0.8)',
      blur: '10px',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    },
    gradient: {
      primary: 'linear-gradient(45deg, rgba(0, 149, 246, 1), rgba(88, 81, 219, 1))',
      dark: 'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 100%)',
      evolved: 'linear-gradient(135deg, rgba(64, 93, 230, 1) 0%, rgba(225, 48, 108, 1) 50%, rgba(252, 175, 69, 1) 100%)'
    },
    shadow: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.5)'
    }
  }
}; 
