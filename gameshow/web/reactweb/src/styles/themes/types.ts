// Theme interface that all themes must implement
export interface Theme {
  colors: {
    // Core colors
    bg: {
      primary: string;    // Main background
      secondary: string;  // Surface/card background
      tertiary: string;  // Elevated surface background
      overlay: string;   // Overlay/modal background
    };
    fg: {
      primary: string;   // Main text
      secondary: string; // Secondary text
      tertiary: string;  // Disabled/muted text
      inverse: string;   // Inverse text (for buttons etc)
    };
    accent: {
      primary: string;   // Main accent (buttons, links)
      secondary: string; // Secondary accent
      success: string;   // Success states
      error: string;     // Error states
      warning: string;   // Warning states
    };
    border: {
      light: string;    // Light borders
      medium: string;   // Medium borders
      heavy: string;    // Heavy borders
    };
    // Gradients
    gradients: {
      primary: string;  // Main gradient
      accent: string;   // Accent gradient (evolved text etc)
      surface: string;  // Surface gradient
    };
    // Overlays
    overlay: {
      light: string;    // Light overlay
      medium: string;   // Medium overlay
      heavy: string;    // Heavy overlay
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;      // 12px - Small labels, metadata
      sm: string;      // 14px - Secondary text, captions
      md: string;      // 16px - Body text
      lg: string;      // 18px - Large body text
      xl: string;      // 24px - Section headings
      '2xl': string;   // 32px - Page titles
      '3xl': string;   // 40px - Hero text
      '4xl': string;   // 48px - Large display text
    };
    fontWeight: {
      light: number;    // 300 - Light text
      regular: number;  // 400 - Regular body text
      medium: number;   // 500 - Medium emphasis
      semibold: number; // 600 - High emphasis
      bold: number;     // 700 - Maximum emphasis
    };
    lineHeight: {
      none: number;     // 1 - Headings
      tight: number;    // 1.25 - Compact text
      snug: number;     // 1.375 - Slightly compact
      normal: number;   // 1.5 - Body text
      relaxed: number;  // 1.625 - Relaxed body text
      loose: number;    // 2 - Very relaxed
    };
    letterSpacing: {
      tighter: string;  // -0.05em
      tight: string;    // -0.025em
      normal: string;   // 0
      wide: string;     // 0.025em
      wider: string;    // 0.05em
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  buttons: {
    primary: {
      background: string;
      text: string;
      hover: string;
      active: string;
    };
    secondary: {
      background: string;
      text: string;
      hover: string;
      active: string;
    };
    error: {
      background: string;
      text: string;
      hover: string;
      active: string;
    };
    disabled: {
      opacity: number;
    };
    borderRadius: string;
    transition: string;
  };
  effects: {
    frostedGlass: {
      background: string;
      blur: string;
      border: string;
    };
    gradient: {
      primary: string;
      dark: string;
      evolved: string;  // Instagram-style gradient for evolved text
    };
    shadow: {
      sm: string;
      md: string;
      lg: string;
    };
  };
}

// Theme validator function
export function validateTheme(theme: Partial<Theme>): theme is Theme {
  const requiredFields = [
    'colors',
    'typography',
    'spacing',
    'buttons',
    'effects'
  ];

  const missingFields = requiredFields.filter(field => !(field in theme));
  if (missingFields.length > 0) {
    console.error(`Theme is missing required fields: ${missingFields.join(', ')}`);
    return false;
  }

  return true;
}

// Theme type guard
export function isTheme(obj: any): obj is Theme {
  return validateTheme(obj);
}

// Available theme names
export type ThemeName = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  themeName: 'light' | 'dark';
  toggleTheme: () => void;
} 
