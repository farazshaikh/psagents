# Wave Background Component

A dynamic, interactive wave animation component that renders configurable animated waves using HTML5 Canvas.

## Features

- Smooth, gradient-colored wave animations
- Configurable wave parameters (amplitude, frequency, speed, colors)
- Interactive control panel for real-time wave manipulation
- Support for multiple waves with individual controls
- Global animation speed control
- Configuration import/export functionality

## Installation

The component is part of the gameshow web application. No additional installation is required.

## Usage

### Basic Usage

```tsx
import WaveBackground from '../components/basic/WaveBackground';

function App() {
  return <WaveBackground />;
}
```

### With Control Panel

```tsx
import WaveBackground from '../components/basic/WaveBackground';

function App() {
  return <WaveBackground panel={true} />;
}
```

### With Custom Configuration

```tsx
import WaveBackground from '../components/basic/WaveBackground';
import { WaveConfig } from '../components/basic/WaveBackground/config';

const customConfig: WaveConfig = {
  waves: [
    {
      baseY: 0.65,
      amplitude: 45,
      frequency: 0.003,
      speed: 0.12,
      startColor: '#00ff00',
      endColor: '#00ffaa',
      width: 40
    }
    // ... additional waves
  ],
  globalSpeed: 1,
  numWaves: 1
};

function App() {
  return <WaveBackground config={customConfig} />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| panel | boolean | false | Shows/hides the control panel |
| config | WaveConfig | defaultConfig | Custom wave configuration |

## Configuration

The wave configuration follows this structure:

```typescript
interface WaveParams {
  baseY: number;      // Vertical position (0-1)
  amplitude: number;  // Wave height
  frequency: number;  // Wave density
  speed: number;     // Animation speed
  startColor: string; // Gradient start color
  endColor: string;  // Gradient end color
  width: number;     // Wave thickness
}

interface WaveConfig {
  waves: WaveParams[];
  globalSpeed: number;
  numWaves: number;
}
```

## Environment Variables

The wave controller visibility can be controlled through feature flags:

1. Using the `REACT_APP_WAVE_CONTROLLER` environment variable:
   ```bash
   REACT_APP_WAVE_CONTROLLER=true npm start
   ```

2. Using the feature flags utility:
   ```typescript
   // In your featureFlags.ts
   export const useFeatureFlags = () => ({
     waveController: process.env.REACT_APP_WAVE_CONTROLLER === 'true'
   });
   ```

## Control Panel Features

- **Global Controls**
  - Number of waves (1-5)
  - Animation speed (0.1x - 2.0x)

- **Per-Wave Controls**
  - Amplitude (10-60)
  - Frequency (0.001-0.01)
  - Speed (0.01-0.2)
  - Start/End colors

- **Utility Buttons**
  - Reset to Default: Restores default configuration
  - Dump Settings: Copies current configuration to clipboard and logs to debug console 