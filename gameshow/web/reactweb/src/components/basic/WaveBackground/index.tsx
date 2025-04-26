import React, { useEffect, useRef, useCallback } from 'react';
import { WaveParams, WaveConfig, SineWaveComposition } from './config';
import './styles.css';

/**
 * WaveBackground Component
 *
 * Creates an animated wave effect using multiple parallel lines with carefully designed
 * opacity and color gradients to create a 3D tubular appearance.
 *
 * The wave effect is achieved through two main visual techniques:
 *
 * 1. Vertical Opacity Gradient:
 *    - Multiple parallel lines are drawn with varying opacity
 *    - Lines are spaced evenly using renderConfig.lineSpacing
 *    - Opacity follows a linear gradient from edges to center:
 *      - Edge lines: 5% opacity (0.05)
 *      - Center line: 35% opacity (0.35)
 *      - Linear interpolation between edges and center
 *    - This creates a subtle 3D tube effect without harsh transitions
 *
 * 2. Horizontal Color Gradient:
 *    - Each line uses the same horizontal color gradient
 *    - Gradient progresses through carefully chosen blue shades:
 *      - 0%:  #050A14 - Nearly black with slight blue tint
 *      - 20%: #0A1A2B - Very dark blue-black
 *      - 40%: #1A3251 - Dark blue
 *      - 70%: #2B5486 - Medium-dark blue
 *      - 90%: #4A90E2 - Bright blue
 *      - 100%: #66A5F2 - Brightest, saturated blue
 *    - More color stops in darker range for subtle transition
 *    - Compressed bright range creates dramatic endpoint
 *
 * The combination of these gradients creates a sophisticated wave effect that:
 * - Appears as a 3D tube through opacity variation
 * - Has depth and drama through the color progression
 * - Maintains smooth transitions without harsh edges
 * - Creates visual interest through contrast between dark and light
 */

interface WaveBackgroundProps {
  config: WaveConfig;
}

interface PerformanceMetrics {
  lastFrameTime: number;
  frameCount: number;
  frameTimeSum: number;
  lastFpsUpdate: number;
  renderCount: number;
  waveCalculationTime: number;
  stateUpdateCount: number;
}

// Performance optimization constants
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
const DEBUG_PERFORMANCE = false;

const logMetrics = (metrics: PerformanceMetrics) => {
  if (!window.debug) return;

  const avgFrameTime = metrics.frameTimeSum / Math.max(1, metrics.frameCount);
  const fps = metrics.frameCount > 0 ? 1000 / avgFrameTime : 0;

  window.debug('Wave Background Performance:');
  window.debug(`FPS: ${fps.toFixed(2)}`);
  window.debug(`Frame Time: ${avgFrameTime.toFixed(2)}ms`);
  window.debug(`Wave Calc Time: ${metrics.waveCalculationTime.toFixed(2)}ms`);
  window.debug(`State Updates: ${metrics.stateUpdateCount}`);
  window.debug(`Render Count: ${metrics.renderCount}`);
};

// Calculate maximum possible amplitude for a wave
const calculateMaxAmplitude = (wave: WaveParams, sineWaves: {
  primary: SineWaveComposition;
  secondary: SineWaveComposition;
  tertiary: SineWaveComposition;
}) => {
  // Sum the maximum possible amplitudes of all component waves
  const primaryMax = wave.amplitude * sineWaves.primary.amplitude;
  const secondaryMax = wave.amplitude * sineWaves.secondary.amplitude;
  const tertiaryMax = wave.amplitude * sineWaves.tertiary.amplitude;

  // Since all waves could theoretically align at their peaks,
  // the maximum total amplitude is the sum of individual maximums
  return primaryMax + secondaryMax + tertiaryMax;
};

// Add these helper functions at the top of the file after imports
const hexToRGB = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const WaveBackground: React.FC<WaveBackgroundProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Add performance metrics ref
  const metricsRef = useRef<PerformanceMetrics>({
    lastFrameTime: performance.now(),
    frameCount: 0,
    frameTimeSum: 0,
    lastFpsUpdate: 0,
    renderCount: 0,
    waveCalculationTime: 0,
    stateUpdateCount: 0
  });

  // Log performance metrics every second
  useEffect(() => {
    if (!DEBUG_PERFORMANCE) return;

    const logInterval = setInterval(() => {
      logMetrics(metricsRef.current);

      // Reset counters
      metricsRef.current.frameCount = 0;
      metricsRef.current.frameTimeSum = 0;
      metricsRef.current.stateUpdateCount = 0;
      metricsRef.current.waveCalculationTime = 0;
      metricsRef.current.renderCount = 0;
    }, 1000);

    return () => clearInterval(logInterval);
  }, []);

  const drawWave = useCallback((ctx: CanvasRenderingContext2D, wave: WaveParams, waveY: number) => {
    const startTime = performance.now();
    const points: [number, number][] = [];
    const canvas = ctx.canvas;
    // Calculate wave points
    for (let x = 0; x <= canvas.width; x += 2) {
      const primaryWave = Math.sin(
        x * wave.frequency * config.sineWaves.primary.frequency +
        timeRef.current * wave.speed * config.globalSpeed * config.sineWaves.primary.speed
      ) * wave.amplitude * config.sineWaves.primary.amplitude;

      const secondaryWave = Math.sin(
        x * wave.frequency * config.sineWaves.secondary.frequency +
        timeRef.current * wave.speed * config.globalSpeed * config.sineWaves.secondary.speed
      ) * wave.amplitude * config.sineWaves.secondary.amplitude;

      const tertiaryWave = Math.sin(
        x * wave.frequency * config.sineWaves.tertiary.frequency +
        timeRef.current * wave.speed * config.globalSpeed * config.sineWaves.tertiary.speed
      ) * wave.amplitude * config.sineWaves.tertiary.amplitude;

      const y = waveY + (primaryWave + secondaryWave + tertiaryWave);
      points.push([x, y]);
    }

    if (DEBUG_PERFORMANCE) {
      metricsRef.current.waveCalculationTime += performance.now() - startTime;
    }

    // Create gradient for the wave
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);

    // Create simple linear opacity gradient from start to end
    const startRGB = hexToRGB(wave.startColor);
    const endRGB = hexToRGB(wave.endColor);

    // Just two stops for a pure linear gradient from transparent to fully opaque
    gradient.addColorStop(0, `rgba(${startRGB[0]}, ${startRGB[1]}, ${startRGB[2]}, 0.0)`);    // Start fully transparent
    gradient.addColorStop(1, `rgba(${endRGB[0]}, ${endRGB[1]}, ${endRGB[2]}, 1.0)`);         // End fully opaque

    // Calculate the total height of all lines
    const totalHeight = (config.renderConfig.numLines - 1) * config.renderConfig.lineSpacing;
    const halfHeight = totalHeight / 2;

    // Draw multiple parallel lines
    for (let lineIndex = 0; lineIndex < config.renderConfig.numLines; lineIndex++) {
      const lineOffset = -halfHeight + (lineIndex * (config.renderConfig.lineSpacing + 1));

      // Calculate opacity based on distance from center
      const distanceFromCenter = Math.abs(lineIndex - (config.renderConfig.numLines - 1) / 2) / ((config.renderConfig.numLines - 1) / 2);
      const verticalOpacity = 0.2 + (0.6 * (1 - distanceFromCenter));  // Base vertical opacity variation

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1] + lineOffset);

      // Draw the line using quadratic curves for smooth interpolation
      for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i][0] + points[i + 1][0]) / 2;
        const yc = (points[i][1] + points[i + 1][1]) / 2;
        ctx.quadraticCurveTo(
          points[i][0],
          points[i][1] + lineOffset,
          xc,
          yc + lineOffset
        );
      }

      // Draw the last segment
      const last = points[points.length - 1];
      ctx.lineTo(last[0], last[1] + lineOffset);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = config.renderConfig.lineWidth;
      ctx.globalAlpha = verticalOpacity;  // Apply vertical opacity variation
      ctx.stroke();
    }

    if (DEBUG_PERFORMANCE) {
      metricsRef.current.renderCount++;
    }
  }, [config]);

  const animate = useCallback(() => {
    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;

    // Skip frame if too soon
    if (elapsed < FRAME_TIME) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });

    if (!canvas || !ctx) return;

    if (DEBUG_PERFORMANCE) {
      metricsRef.current.frameTimeSum += elapsed;
      metricsRef.current.frameCount++;
    }

    lastFrameTimeRef.current = now;

    // Clear the entire canvas with proper dimensions
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each wave
    const firstWaveMaxAmplitude = calculateMaxAmplitude(config.waves[0], config.sineWaves);
    const waveHeight = config.renderConfig.numLines * (config.renderConfig.lineWidth + config.renderConfig.lineSpacing) + config.renderConfig.waveSpacing
    const topspacing = firstWaveMaxAmplitude + 0.5 * waveHeight

    config.waves.slice(0, config.numWaves).forEach((wave, index) => {
      // Add amplitude padding to ALL waves to shift everything down
      // division by 1 will make the waves non overlapping.
      let waveY =  index * (waveHeight/3);
      drawWave(ctx, wave, waveY + topspacing);
    });

    // Increase animation speed by adjusting time increment
    timeRef.current += 0.016 * config.globalSpeed; // Adjusted for 60fps and using globalSpeed
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [drawWave, config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use container dimensions directly
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      ctx.scale(dpr, dpr);
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  return (
    <div className="wave-container" ref={containerRef}>
      <canvas ref={canvasRef} className="wave-canvas" />
    </div>
  );
};

export default WaveBackground;