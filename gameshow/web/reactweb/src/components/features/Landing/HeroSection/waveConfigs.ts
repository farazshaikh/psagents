import { WaveConfig } from '../../../basic/WaveBackground/config';

// Common configuration shared between start and end states
const commonConfig = {
  waves: [
    {
      amplitude: 45,
      frequency: 0.003,
      speed: 0.12,
      width: 1,
      startColor: '#404040',  // Much dimmer gray (76.9 IRE)
      endColor: '#FFFFFF'     // Pure white
    },
    {
      amplitude: 42,
      frequency: 0.0033,
      speed: 0.11,
      width: 1,
      startColor: '#3D3D00',  // Dimmer yellow (69.0 IRE)
      endColor: '#FFFF66'     // Brighter yellow
    },
    {
      amplitude: 39,
      frequency: 0.0036,
      speed: 0.10,
      width: 1,
      startColor: '#336666',  // Dimmer cyan (56.1 IRE)
      endColor: '#66FFFF'     // Brighter cyan
    },
    {
      amplitude: 36,
      frequency: 0.0039,
      speed: 0.09,
      width: 1,
      startColor: '#004000',  // Dimmer green (48.2 IRE)
      endColor: '#66FF66'     // Brighter green
    },
    {
      amplitude: 33,
      frequency: 0.0042,
      speed: 0.08,
      width: 1,
      startColor: '#400040',  // Dimmer magenta (36.2 IRE)
      endColor: '#FF66FF'     // Brighter magenta
    },
    {
      amplitude: 30,
      frequency: 0.0045,
      speed: 0.07,
      width: 1,
      startColor: '#400000',  // Dimmer red (28.2 IRE)
      endColor: '#FF6666'     // Brighter red
    },
    {
      amplitude: 27,
      frequency: 0.0048,
      speed: 0.06,
      width: 1,
      startColor: '#000040',  // Dimmer blue (15.4 IRE)
      endColor: '#6666FF'     // Brighter blue
    }
  ],
  globalSpeed: 10,
  numWaves: 7,  // Using all 7 SMPTE colors
  renderConfig: {
    numLines: 20,
    lineWidth: 2,
    lineSpacing: 3,
    waveSpacing: 1,  // Added spacing between waves for visibility
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