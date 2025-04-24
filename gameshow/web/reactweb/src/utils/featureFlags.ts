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

// Get feature flags from environment variables
export const getFeatureFlags = (): FeatureFlags => ({
  debugConsole: parseBoolean(process.env.REACT_APP_DEBUG_CONSOLE),
  waveController: parseBoolean(process.env.REACT_APP_WAVE_CONTROLLER),
});

// Helper hook to access feature flags
export const useFeatureFlags = () => {
  return useMemo(() => getFeatureFlags(), []);
}; 