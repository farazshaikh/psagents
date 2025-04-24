export interface WaveParams {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  startColor: string;
  endColor: string;
  width: number;
}

export interface SineWaveComposition {
  frequency: number;  // Multiplier for the base frequency
  speed: number;     // Multiplier for the base speed
  amplitude: number;  // Multiplier for the contribution to final wave
}

export interface RenderConfig {
  numLines: number;
  gradientPhaseSpeed: number;
  lineWidth: number;      // Width of each line in pixels
  lineSpacing: number;    // Space between lines in pixels
}

export interface WaveConfig {
  waves: WaveParams[];
  globalSpeed: number;
  numWaves: number;
  // Each final wave is composed of three overlapping sine waves
  // that are added together to create more organic movement
  sineWaves: {
    // Main wave that defines the primary motion
    primary: SineWaveComposition;
    // Faster wave with less amplitude for medium-scale variation
    secondary: SineWaveComposition;
    // Even faster wave with smallest amplitude for fine detail
    tertiary: SineWaveComposition;
  };
  renderConfig: RenderConfig;
}

export const defaultConfig: WaveConfig = {
  waves: [
    {
      baseY: 0.65,
      amplitude: 45,
      frequency: 0.003,
      speed: 0.12,
      startColor: '#00ff00',
      endColor: '#00ffaa',
      width: 40
    },
    {
      baseY: 0.7,
      amplitude: 40,
      frequency: 0.0035,
      speed: 0.1,
      startColor: '#00ffaa',
      endColor: '#00ffff',
      width: 40
    },
    {
      baseY: 0.75,
      amplitude: 35,
      frequency: 0.004,
      speed: 0.09,
      startColor: '#00ffff',
      endColor: '#0099ff',
      width: 40
    },
    {
      baseY: 0.8,
      amplitude: 30,
      frequency: 0.0045,
      speed: 0.08,
      startColor: '#0099ff',
      endColor: '#6600ff',
      width: 40
    },
    {
      baseY: 0.85,
      amplitude: 25,
      frequency: 0.005,
      speed: 0.07,
      startColor: '#6600ff',
      endColor: '#ff00ff',
      width: 40
    }
  ],
  globalSpeed: 1.0,
  numWaves: 3,
  // Wave composition settings - each value is a multiplier
  sineWaves: {
    // Main wave (1x frequency, 1x speed, full amplitude)
    primary: {
      frequency: 1.0,    // Base frequency multiplier
      speed: 1.0,        // Base speed multiplier
      amplitude: 1.0     // Full contribution to final wave
    },
    // Medium variation (1.5x frequency, 0.7x speed, 0.4x amplitude)
    secondary: {
      frequency: 1.5,  // 50% higher frequency than primary
      speed: 0.7,      // 30% slower than primary
      amplitude: 0.4   // 40% of primary's amplitude
    },
    // Fine detail (3x frequency, 0.5x speed, 0.2x amplitude)
    tertiary: {
      frequency: 3.0,    // 3x higher frequency than primary
      speed: 0.5,      // 50% slower than primary
      amplitude: 0.2   // 20% of primary's amplitude
    }
  },
  renderConfig: {
    numLines: 20,          // Number of lines used to create wave thickness
    gradientPhaseSpeed: 0.5, // Speed of color gradient animation
    lineWidth: 1.5,      // Default line width of 1.5 pixels
    lineSpacing: 2.5     // Default spacing of 2.5 pixels between lines
  }
};