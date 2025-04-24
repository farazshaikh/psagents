import { useMemo } from 'react';

interface FeatureFlags {
  debugConsole: boolean;
  waveController: boolean;
}

// Parse boolean from string, handling various truthy values
const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
};

// In production, all flags are forced to false regardless of environment variables
const isProduction = process.env.NODE_ENV === 'production';

// Get feature flags from environment variables
export const getFeatureFlags = (): FeatureFlags => ({
  debugConsole: isProduction ? false : parseBoolean(process.env.REACT_APP_DEBUG_CONSOLE),
  waveController: isProduction ? false : parseBoolean(process.env.REACT_APP_WAVE_CONTROLLER),
});

// Helper hook to access feature flags
export const useFeatureFlags = () => {
  return useMemo(() => getFeatureFlags(), []);
};

// Debug logging utility that gets completely removed in production builds
export const debugLog = (message: string): void => {
  if (process.env.NODE_ENV !== 'production') {
    if (window.debug) {
      window.debug(message);
    } else {
      console.log('[Debug]:', message);
    }
  }
}; 