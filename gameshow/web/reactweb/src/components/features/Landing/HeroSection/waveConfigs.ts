import { WaveConfig } from '../../../basic/WaveBackground/config';

// Common configuration shared between start and end states
const commonConfig = {
  waves: [
    {
      amplitude: 40,
      frequency: 0.005,
      speed: 0.1,
      baseY: 0.5,
      width: 1,
      startColor: '#4A90E2',
      endColor: '#50E3C2'
    }
  ],
  globalSpeed: 1,
  numWaves: 1,
  renderConfig: {
    numLines: 15,
    lineWidth: 2,
    lineSpacing: 4,
    gradientPhaseSpeed: 0.5
  }
};

// Start config with horizontal lines (zero amplitude sine waves)
export const startConfig: WaveConfig = {
  ...commonConfig,
  sineWaves: {
    primary: { frequency: 1, speed: 1, amplitude: 0 },
    secondary: { frequency: 2, speed: 0.8, amplitude: 0 },
    tertiary: { frequency: 3, speed: 0.6, amplitude: 0 }
  }
};

// End config with full wave animation
export const endConfig: WaveConfig = {
  ...commonConfig,
  sineWaves: {
    primary: { frequency: 1, speed: 1, amplitude: 1 },
    secondary: { frequency: 2, speed: 0.8, amplitude: 0.5 },
    tertiary: { frequency: 3, speed: 0.6, amplitude: 0.3 }
  }
};

// Custom cycle timing configuration
export const cycleConfig = {
  cycleDuration: 30000,    // 30 second cycle
  startWaitTime: 0.4,      // Wait 40% at start (12 seconds)
  endWaitTime: 0.3,        // Wait 30% at end (9 seconds)
  transitionTime: 0.1      // 10% transition time (3 seconds)
};