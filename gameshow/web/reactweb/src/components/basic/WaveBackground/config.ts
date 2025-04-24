export interface WaveParams {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  startColor: string;
  endColor: string;
  width: number;
}

export interface WaveConfig {
  waves: WaveParams[];
  globalSpeed: number;
  numWaves: number;
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
  globalSpeed: 1,
  numWaves: 5
}; 