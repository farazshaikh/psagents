import React, { useEffect, useRef, useState } from 'react';
import { WaveConfig } from '../WaveBackground/config';
import WaveBackground from '../WaveBackground';

/**
 * CyclicWaveBackground Component
 * 
 * A composable animation adapter component that provides cyclic transitions between two wave states.
 * This component wraps the base WaveBackground component and handles the animation logic,
 * allowing for smooth transitions between different wave configurations.
 * 
 * Features:
 * - Smooth interpolation between wave configurations
 * - Configurable cycle timing and behavior
 * - Cubic easing for natural transitions
 * - Automatic animation cleanup
 * 
 * Animation Cycle:
 * 1. Hold at start configuration (startWaitTime)
 * 2. Smoothly interpolate to end configuration (transitionTime)
 * 3. Hold at end configuration (endWaitTime)
 * 4. Smoothly interpolate back to start configuration (transitionTime)
 * 5. Repeat
 * 
 * @example
 * ```tsx
 * <CyclicWaveBackground
 *   startConfig={startWaveConfig}
 *   endConfig={endWaveConfig}
 *   cycleConfig={{
 *     cycleDuration: 30000,    // 30 seconds per cycle
 *     startWaitTime: 0.4,      // 40% of cycle
 *     endWaitTime: 0.3,        // 30% of cycle
 *     transitionTime: 0.1      // 10% of cycle for each transition
 *   }}
 * />
 * ```
 */

interface CyclicWaveBackgroundProps {
  /** Initial wave configuration */
  startConfig: WaveConfig;
  /** Target wave configuration to transition to */
  endConfig: WaveConfig;
  /** Show wave control panel */
  panel?: boolean;
  /** Initial collapsed state of control panel */
  initialCollapsed?: boolean;
  /** Timing configuration for the animation cycle */
  cycleConfig?: {
    /** Total duration of one cycle in milliseconds */
    cycleDuration?: number;
    /** Percentage of cycle to wait at start config (0-1) */
    startWaitTime?: number;
    /** Percentage of cycle to wait at end config (0-1) */
    endWaitTime?: number;
    /** Percentage of cycle for each transition (0-1) */
    transitionTime?: number;
  };
}

/** Default timing configuration */
const defaultCycleConfig = {
  cycleDuration: 30000,   // 30 seconds
  startWaitTime: 0.4,     // 40%
  endWaitTime: 0.3,       // 30%
  transitionTime: 0.1,    // 10%
};

/**
 * Linear interpolation between two numbers
 */
const lerp = (a: number, b: number, t: number): number => 
  a * (1 - t) + b * t;

const CyclicWaveBackground: React.FC<CyclicWaveBackgroundProps> = ({
  startConfig,
  endConfig,
  panel = false,
  initialCollapsed = true,
  cycleConfig = {}
}) => {
  const {
    cycleDuration = defaultCycleConfig.cycleDuration,
  } = cycleConfig;

  const [currentConfig, setCurrentConfig] = useState<WaveConfig>(startConfig);
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Interpolate between two wave configurations
  const lerpConfig = (start: WaveConfig, end: WaveConfig, t: number): WaveConfig => {
    return {
      waves: start.waves.map((startWave, index) => {
        const endWave = end.waves[index];
        return {
          ...startWave,
          amplitude: lerp(startWave.amplitude, endWave.amplitude, t),
          frequency: lerp(startWave.frequency, endWave.frequency, t),
          speed: lerp(startWave.speed, endWave.speed, t)
        };
      }),
      globalSpeed: lerp(start.globalSpeed, end.globalSpeed, t),
      numWaves: start.numWaves,
      sineWaves: {
        primary: {
          frequency: lerp(start.sineWaves.primary.frequency, end.sineWaves.primary.frequency, t),
          speed: lerp(start.sineWaves.primary.speed, end.sineWaves.primary.speed, t),
          amplitude: lerp(start.sineWaves.primary.amplitude, end.sineWaves.primary.amplitude, t)
        },
        secondary: {
          frequency: lerp(start.sineWaves.secondary.frequency, end.sineWaves.secondary.frequency, t),
          speed: lerp(start.sineWaves.secondary.speed, end.sineWaves.secondary.speed, t),
          amplitude: lerp(start.sineWaves.secondary.amplitude, end.sineWaves.secondary.amplitude, t)
        },
        tertiary: {
          frequency: lerp(start.sineWaves.tertiary.frequency, end.sineWaves.tertiary.frequency, t),
          speed: lerp(start.sineWaves.tertiary.speed, end.sineWaves.tertiary.speed, t),
          amplitude: lerp(start.sineWaves.tertiary.amplitude, end.sineWaves.tertiary.amplitude, t)
        }
      },
      renderConfig: start.renderConfig
    };
  };

  useEffect(() => {
    const updateConfig = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const cycleTime = (elapsed % cycleDuration) / cycleDuration;

      // Pure linear transition back and forth - no easing at all
      const t = cycleTime < 0.5 
        ? cycleTime * 2        // Linear 0 to 1
        : 2 * (1 - cycleTime); // Linear 1 to 0

      // Remove smoothEase to eliminate any pausing at endpoints
      setCurrentConfig(lerpConfig(startConfig, endConfig, t));
      animationFrameRef.current = requestAnimationFrame(updateConfig);
    };

    startTimeRef.current = Date.now();
    updateConfig();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startConfig, endConfig, cycleDuration]);

  return (
    <WaveBackground
      config={currentConfig}
      panel={panel}
      initialCollapsed={initialCollapsed}
    />
  );
};

export default CyclicWaveBackground; 