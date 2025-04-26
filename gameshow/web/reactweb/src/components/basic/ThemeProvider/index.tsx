import React, { createContext, useContext, useCallback, useMemo } from 'react';
import '../../styles/themes/base.css';
import '../../styles/themes/dark.css';

interface Typography {
  fontFamily: string;
  fontSize: {
    small: string;
    medium: string;
    large: string;
  };
  fontWeight: {
    regular: number;
    medium: number;
    bold: number;
  };
}

interface Colors {
  primary: {
    main: string;
    hover: string;
    active: string;
    text: string;
  };
  secondary: {
    main: string;
    hover: string;
    active: string;
    text: string;
  };
  error: {
    main: string;
    hover: string;
    active: string;
    text: string;
  };
  background: {
    default: string;
    paper: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

interface Spacing {
  unit: number;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

interface ButtonTheme {
  borderRadius: string;
  transition: string;
  sizes: {
    small: {
      padding: string;
      fontSize: string;
    };
    medium: {
      padding: string;
      fontSize: string;
    };
    large: {
      padding: string;
      fontSize: string;
    };
  };
  disabled: {
    opacity: number;
  };
  variants: {
    contained: {
      background: string;
      color: string;
      hover: string;
      active: string;
      focusRing: string;
    };
    outlined: {
      border: string;
      color: string;
      hover: string;
      focusRing: string;
    };
    text: {
      color: string;
      hover: string;
      focusRing: string;
    };
  };
  effects: {
    frosted: {
      background: string;
      backdropFilter: string;
      border: string;
    };
    gradient: {
      background: string;
      hover: string;
      active: string;
    };
  };
}

interface Theme {
  typography: Typography;
  colors: Colors;
  spacing: Spacing;
  buttons: ButtonTheme;
}

interface ThemeContextValue {
  theme: Theme;
  updateTheme: (newTheme: Partial<Theme>) => void;
}

const defaultTheme: Theme = {
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    fontSize: {
      small: '0.875rem',
      medium: '1rem',
      large: '1.125rem',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
  colors: {
    primary: {
      main: '#0095F6',
      hover: '#1877F2',
      active: '#0077E6',
      text: '#FFFFFF',
    },
    secondary: {
      main: '#6B7280',
      hover: '#4B5563',
      active: '#374151',
      text: '#FFFFFF',
    },
    error: {
      main: '#DC2626',
      hover: '#B91C1C',
      active: '#991B1B',
      text: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#F3F4F6',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
  },
  spacing: {
    unit: 4,
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  buttons: {
    borderRadius: '4px',
    transition: 'all 0.2s ease-in-out',
    sizes: {
      small: {
        padding: '0.25rem 0.5rem',
        fontSize: '0.875rem',
      },
      medium: {
        padding: '0.5rem 1rem',
        fontSize: '1rem',
      },
      large: {
        padding: '0.75rem 1.5rem',
        fontSize: '1.125rem',
      },
    },
    disabled: {
      opacity: 0.6,
    },
    variants: {
      contained: {
        background: '#0095F6',
        color: '#FFFFFF',
        hover: '#1877F2',
        active: '#0077E6',
        focusRing: 'rgba(0, 149, 246, 0.5)',
      },
      outlined: {
        border: '1px solid #0095F6',
        color: '#0095F6',
        hover: 'rgba(0, 149, 246, 0.1)',
        focusRing: 'rgba(0, 149, 246, 0.5)',
      },
      text: {
        color: '#0095F6',
        hover: 'rgba(0, 149, 246, 0.1)',
        focusRing: 'rgba(0, 149, 246, 0.5)',
      },
    },
    effects: {
      frosted: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      },
      gradient: {
        background: 'linear-gradient(135deg, #FF4E50 0%, #F43B47 50%, #453A94 100%)',
        hover: 'linear-gradient(135deg, #FF6B6C 0%, #F54E59 50%, #5849A6 100%)',
        active: 'linear-gradient(135deg, #E64547 0%, #DC3540 50%, #3D3485 100%)',
      },
    },
  },
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  initialTheme?: Partial<Theme>;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  initialTheme,
  children,
}) => {
  const [theme, setTheme] = React.useState<Theme>({
    ...defaultTheme,
    ...initialTheme,
  });

  const updateTheme = useCallback((newTheme: Partial<Theme>) => {
    setTheme(prevTheme => ({
      ...prevTheme,
      ...newTheme,
    }));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      updateTheme,
    }),
    [theme, updateTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 