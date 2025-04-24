import { WaveConfig } from './config';

export const startConfig: WaveConfig = {
  waves: [
    {
      baseY: 0.60,
      amplitude: 0,  // No wave movement
      frequency: 0,  // No wave pattern
      speed: 0,     // No animation
      startColor: '#666600', // Dark yellow
      endColor: '#FFFF00',  // Bright yellow
      width: 40
    },
    {
      baseY: 0.65,
      amplitude: 0,
      frequency: 0,
      speed: 0,
      startColor: '#006666', // Dark cyan
      endColor: '#00FFFF',  // Bright cyan
      width: 40
    },
    {
      baseY: 0.70,
      amplitude: 0,
      frequency: 0,
      speed: 0,
      startColor: '#006600', // Dark green
      endColor: '#00FF00',  // Bright green
      width: 40
    },
    {
      baseY: 0.75,
      amplitude: 0,
      frequency: 0,
      speed: 0,
      startColor: '#660066', // Dark magenta
      endColor: '#FF00FF',  // Bright magenta
      width: 40
    },
    {
      baseY: 0.80,
      amplitude: 0,
      frequency: 0,
      speed: 0,
      startColor: '#660000', // Dark red
      endColor: '#FF0000',  // Bright red
      width: 40
    },
    {
      baseY: 0.85,
      amplitude: 0,
      frequency: 0,
      speed: 0,
      startColor: '#000066', // Dark blue
      endColor: '#0000FF',  // Bright blue
      width: 40
    },
    {
      baseY: 0.90,
      amplitude: 0,
      frequency: 0,
      speed: 0,
      startColor: '#666666', // Dark white/gray
      endColor: '#FFFFFF',  // Bright white
      width: 40
    }
  ],
  globalSpeed: 0,
  numWaves: 7,
  sineWaves: {
    primary: {
      frequency: 0,
      speed: 0,
      amplitude: 0
    },
    secondary: {
      frequency: 0,
      speed: 0,
      amplitude: 0
    },
    tertiary: {
      frequency: 0,
      speed: 0,
      amplitude: 0
    }
  },
  renderConfig: {
    numLines: 20,
    gradientPhaseSpeed: 0,
    lineWidth: 1.5,
    lineSpacing: 3
  }
}; 