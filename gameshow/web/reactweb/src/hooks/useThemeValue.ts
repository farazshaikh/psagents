import { useCallback } from 'react';

/**
 * Hook to get computed CSS custom property values from the theme
 */
export const useThemeValue = () => {
  const getValue = useCallback((propertyName: string, element: HTMLElement | null = document.documentElement) => {
    if (!element) return '';
    
    const computedStyle = getComputedStyle(element);
    return computedStyle.getPropertyValue(propertyName).trim();
  }, []);

  const setValue = useCallback((propertyName: string, value: string, element: HTMLElement | null = document.documentElement) => {
    if (!element) return;
    
    element.style.setProperty(propertyName, value);
  }, []);

  return { getValue, setValue };
}; 