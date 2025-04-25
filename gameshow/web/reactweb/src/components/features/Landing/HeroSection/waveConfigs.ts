import { WaveConfig } from '../../../basic/WaveBackground/config';

// Common configuration shared between start and end states
const commonConfig = {
  waves: [
    {
      amplitude: 35,
      frequency: 0.004,
      speed: 0.12,
      baseY: 0.45,  // First wave slightly higher
      width: 1,
      startColor: '#4A90E2',  // Blue theme
      endColor: '#66A5F2'
    },
    {
      amplitude: 30,
      frequency: 0.005,
      speed: 0.08,
      baseY: 0.55,  // Second wave slightly lower
      width: 1,
      startColor: '#50E3C2',  // Teal theme
      endColor: '#40B3A2'
    },
    {
      amplitude: 30,
      frequency: 0.005,
      speed: 0.08,
      baseY: 0.55,  // Second wave slightly lower
      width: 1,
      startColor: '#9B51E0',  // Deep purple
      endColor: '#B794F4',    // Light purple
    }
  ],
  globalSpeed: 1,
  numWaves: 3,  // Now using two waves
  renderConfig: {
    numLines: 5,
    lineWidth: 1,
    lineSpacing:1,
    waveSpacing: 0,  // Vertical spacing between waves
    gradientPhaseSpeed: 0.5
  }
};

// Start config with horizontal lines (zero amplitude sine waves)
export const startConfig: WaveConfig = {
  ...commonConfig,
  sineWaves: {
    primary: { frequency: 1, speed: 1, amplitude: 0 },
    secondary: { frequency: 1.5, speed: 0.8, amplitude: 0 },
    tertiary: { frequency: 2, speed: 0.6, amplitude: 0 }
  }
};

// End config with full wave animation
export const endConfig: WaveConfig = {
  ...commonConfig,
  sineWaves: {
    primary: { frequency: 1, speed: 1, amplitude: 1 },
    secondary: { frequency: 1.5, speed: 0.8, amplitude: 0.4 },
    tertiary: { frequency: 2, speed: 0.6, amplitude: 0.2 }
  }
};

// Custom cycle timing configuration
export const cycleConfig = {
  cycleDuration: 30000,    // 30 second cycle
  startWaitTime: 0.4,      // Wait 40% at start (12 seconds)
  endWaitTime: 0.3,        // Wait 30% at end (9 seconds)
  transitionTime: 0.1      // 10% transition time (3 seconds)
};