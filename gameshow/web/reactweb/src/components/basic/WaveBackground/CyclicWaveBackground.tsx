import React, { useEffect, useRef, useState } from 'react';
import WaveBackground from './index';
import { WaveConfig, defaultConfig } from './config';
import { startConfig } from './startConfig';

interface CyclicWaveBackgroundProps {
  panel?: boolean;
  initialCollapsed?: boolean;
  cycleConfig?: {
    cycleDuration?: number;    // Total duration of one cycle in ms
    transitionRatio?: number;  // Portion of cycle spent transitioning (0-1)
  };
}

// Smooth easing function for natural transitions
const smoothEase = (x: number): number => {
  // Combine smoothstep with extra smoothing at the edges
  const t = x * x * x * (x * (x * 6 - 15) + 10); // smoothstep
  return t * t * (3 - 2 * t); // extra smoothing
};

// Linear interpolation helper
const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

// Interpolate between two wave configs
const interpolateConfig = (startConfig: WaveConfig, targetConfig: WaveConfig, t: number): WaveConfig => {
  return {
    waves: startConfig.waves.map((wave, index) => ({
      ...wave,
      amplitude: lerp(wave.amplitude, targetConfig.waves[index].amplitude, t),
      frequency: lerp(wave.frequency, targetConfig.waves[index].frequency, t),
      speed: lerp(wave.speed, targetConfig.waves[index].speed, t)
    })),
    globalSpeed: lerp(startConfig.globalSpeed, targetConfig.globalSpeed, t),
    numWaves: startConfig.numWaves,
    sineWaves: {
      primary: {
        frequency: lerp(startConfig.sineWaves.primary.frequency, targetConfig.sineWaves.primary.frequency, t),
        speed: lerp(startConfig.sineWaves.primary.speed, targetConfig.sineWaves.primary.speed, t),
        amplitude: lerp(startConfig.sineWaves.primary.amplitude, targetConfig.sineWaves.primary.amplitude, t)
      },
      secondary: {
        frequency: lerp(startConfig.sineWaves.secondary.frequency, targetConfig.sineWaves.secondary.frequency, t),
        speed: lerp(startConfig.sineWaves.secondary.speed, targetConfig.sineWaves.secondary.speed, t),
        amplitude: lerp(startConfig.sineWaves.secondary.amplitude, targetConfig.sineWaves.secondary.amplitude, t)
      },
      tertiary: {
        frequency: lerp(startConfig.sineWaves.tertiary.frequency, targetConfig.sineWaves.tertiary.frequency, t),
        speed: lerp(startConfig.sineWaves.tertiary.speed, targetConfig.sineWaves.tertiary.speed, t),
        amplitude: lerp(startConfig.sineWaves.tertiary.amplitude, targetConfig.sineWaves.tertiary.amplitude, t)
      }
    },
    renderConfig: {
      ...startConfig.renderConfig,
      gradientPhaseSpeed: lerp(
        startConfig.renderConfig.gradientPhaseSpeed,
        targetConfig.renderConfig.gradientPhaseSpeed,
        t
      )
    }
  };
};

const CyclicWaveBackground: React.FC<CyclicWaveBackgroundProps> = ({
  panel = false,
  initialCollapsed = true,
  cycleConfig: {
    cycleDuration = 15000,    // 15 seconds per cycle
    transitionRatio = 0.4     // 40% of cycle time spent transitioning
  } = {}
}) => {
  const [currentConfig, setCurrentConfig] = useState<WaveConfig>(startConfig);
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const cycleTime = (elapsed % cycleDuration) / cycleDuration;

      // Calculate the animation phase (0 to 1)
      let t: number;
      if (cycleTime < transitionRatio) {
        // Transitioning up
        t = smoothEase(cycleTime / transitionRatio);
      } else if (cycleTime < 1 - transitionRatio) {
        // Hold at peak
        t = 1;
      } else {
        // Transitioning down
        t = smoothEase(1 - (cycleTime - (1 - transitionRatio)) / transitionRatio);
      }

      // Log animation progress
      if (window.debug && elapsed % 500 < 16) {
        window.debug(`Animation Progress: cycleTime=${Math.round(cycleTime * 100)}% t=${Math.round(t * 100)}% frameTime=${now - lastFrameTimeRef.current}ms`);
        window.debug(`Animation Values: globalSpeed=${Math.round(lerp(startConfig.globalSpeed, defaultConfig.globalSpeed, t) * 100) / 100} amplitude=${Math.round(lerp(startConfig.waves[0].amplitude, defaultConfig.waves[0].amplitude, t) * 100) / 100}`);
      }

      lastFrameTimeRef.current = now;

      // Update the wave configuration
      setCurrentConfig(interpolateConfig(startConfig, defaultConfig, t));

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cycleDuration, transitionRatio]);

  return (
    <WaveBackground
      panel={panel}
      config={currentConfig}
      initialCollapsed={initialCollapsed}
    />
  );
};

export default CyclicWaveBackground; 