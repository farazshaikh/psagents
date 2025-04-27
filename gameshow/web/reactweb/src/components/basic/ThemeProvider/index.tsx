import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { lightTheme } from '../../../styles/themes/light';
import { darkTheme } from '../../../styles/themes/dark';
import type { Theme, ThemeName } from '../../../styles/themes/types';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  themeName: ThemeName;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children,
  themeName,
}) => {
  const [isDark, setIsDark] = useState(() => {
    localStorage.setItem('theme', themeName);
    return themeName === 'dark';
  });

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newTheme = !prev ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return !prev;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    // Set theme class
    root.classList.remove('dark-theme', 'light-theme');
    root.classList.add(isDark ? 'dark-theme' : 'light-theme');
    
    // Set core colors
    root.style.setProperty('--color-background-main', theme.colors.bg.primary);
    root.style.setProperty('--color-background-surface', theme.colors.bg.secondary);
    root.style.setProperty('--color-background-elevated', theme.colors.bg.tertiary);
    root.style.setProperty('--color-text-primary', theme.colors.fg.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.fg.secondary);
    root.style.setProperty('--color-text-disabled', theme.colors.fg.tertiary);
    root.style.setProperty('--color-primary', theme.colors.accent.primary);
    root.style.setProperty('--color-secondary', theme.colors.accent.secondary);
    root.style.setProperty('--color-border', theme.colors.border.light);

    // Set button styles
    root.style.setProperty('--button-primary-background', theme.buttons.primary.background);
    root.style.setProperty('--button-primary-text', theme.buttons.primary.text);
    root.style.setProperty('--button-primary-hover', theme.buttons.primary.hover);
    root.style.setProperty('--button-primary-active', theme.buttons.primary.active);
    
    root.style.setProperty('--button-secondary-background', theme.buttons.secondary.background);
    root.style.setProperty('--button-secondary-text', theme.buttons.secondary.text);
    root.style.setProperty('--button-secondary-hover', theme.buttons.secondary.hover);
    root.style.setProperty('--button-secondary-active', theme.buttons.secondary.active);
    
    root.style.setProperty('--button-error-background', theme.buttons.error.background);
    root.style.setProperty('--button-error-text', theme.buttons.error.text);
    root.style.setProperty('--button-error-hover', theme.buttons.error.hover);
    root.style.setProperty('--button-error-active', theme.buttons.error.active);
    
    root.style.setProperty('--button-disabled-opacity', theme.buttons.disabled.opacity.toString());
    root.style.setProperty('--button-border-radius', theme.buttons.borderRadius);
    root.style.setProperty('--button-transition', theme.buttons.transition);

    // Set effects
    root.style.setProperty('--effects-gradient-primary', theme.colors.gradients.primary);
    root.style.setProperty('--effects-gradient-dark', theme.colors.gradients.surface);
    root.style.setProperty('--effects-gradient-accent', theme.colors.gradients.accent);

    // Set body styles consistently
    document.body.style.backgroundColor = theme.colors.bg.primary;
    document.body.style.color = theme.colors.fg.primary;

  }, [theme, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;