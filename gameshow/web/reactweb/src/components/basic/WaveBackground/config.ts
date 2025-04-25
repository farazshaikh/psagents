export interface WaveParams {
  amplitude: number;
  frequency: number;
  speed: number;
  startColor: string;
  endColor: string;
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
  lineSpacing: number;    // Vertical Space between lines of a single wave in pixels
  waveSpacing: number;    // Vertical spacing between waves in pixels
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
      amplitude: 45,
      frequency: 0.003,
      speed: 0.12,
      startColor: '#666600', // Dark yellow
      endColor: '#FFFF00',  // Bright yellow
    },
    {
      amplitude: 42,
      frequency: 0.0033,
      speed: 0.11,
      startColor: '#006666', // Dark cyan
      endColor: '#00FFFF',  // Bright cyan
    },
    {
      amplitude: 39,
      frequency: 0.0036,
      speed: 0.10,
      startColor: '#006600', // Dark green
      endColor: '#00FF00',  // Bright green
    },
    {
      amplitude: 36,
      frequency: 0.0039,
      speed: 0.09,
      startColor: '#660066', // Dark magenta
      endColor: '#FF00FF',  // Bright magenta
    },
    {
      amplitude: 33,
      frequency: 0.0042,
      speed: 0.08,
      startColor: '#660000', // Dark red
      endColor: '#FF0000',  // Bright red
    },
    {
      amplitude: 30,
      frequency: 0.0045,
      speed: 0.07,
      startColor: '#000066', // Dark blue
      endColor: '#0000FF',  // Bright blue
    },
    {
      amplitude: 27,
      frequency: 0.0048,
      speed: 0.06,
      startColor: '#666666', // Dark white/gray
      endColor: '#FFFFFF',  // Bright white
    }
  ],
  globalSpeed: 5.0,
  numWaves: 7,
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
    lineWidth: 1.5,        // Width of each line in pixels
    lineSpacing: 3,        // Space between lines in a wave
    waveSpacing: 15        // Space between waves
  }
};