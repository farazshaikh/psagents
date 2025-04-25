import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFeatureFlags } from '../../../utils/featureFlags';
import { WaveParams, WaveConfig, defaultConfig, SineWaveComposition } from './config';
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

interface Point {
  x: number;
  y: number;
}

interface RenderConfig {
  verticalPosition: number;
}

interface SineWaveComponent {
  frequency: number;
  speed: number;
  amplitude: number;
}

interface WaveBackgroundParams {
  amplitude: number;
  frequency: number;
  speed: number;
  startColor: string;
  endColor: string;
  width: number;
}

interface WaveBackgroundProps {
  panel?: boolean;
  config: WaveConfig;
  initialCollapsed?: boolean;
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

// Add interpolation helper
const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
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

const adjustColor = (rgb: [number, number, number], factor: number): string => {
  const adjusted = rgb.map(c => Math.floor(c * factor));
  return `rgb(${adjusted[0]}, ${adjusted[1]}, ${adjusted[2]})`;
};

const defaultWaveParams: WaveBackgroundParams = {
  amplitude: 50,
  frequency: 0.005,
  speed: 0.1,
  startColor: '#ff0000',
  endColor: '#00ff00',
  width: 1000
};

const getWavePoints = (
  width: number,
  height: number,
  time: number,
  params: WaveBackgroundParams,
  renderConfig: RenderConfig
) => {
  const points: Point[] = [];
  const { amplitude, frequency, speed } = params;
  const { verticalPosition } = renderConfig;
  
  for (let x = 0; x <= width; x += 5) {
    const y = height * verticalPosition + 
      amplitude * Math.sin(frequency * x + speed * time);
    points.push({ x, y });
  }
  
  return points;
};

const WaveBackground: React.FC<WaveBackgroundProps> = ({ 
  panel = false, 
  config,
  initialCollapsed = true 
}) => {
  const { waveController } = useFeatureFlags();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const [waves, setWaves] = useState<WaveParams[]>(config.waves);
  const [globalSpeed, setGlobalSpeed] = useState(config.globalSpeed);
  const [numWaves, setNumWaves] = useState(config.numWaves);
  const [sineWaves, setSineWaves] = useState(config.sineWaves);
  const [renderConfig, setRenderConfig] = useState(config.renderConfig);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const showControls = waveController || panel;

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

  // Update state when config prop changes
  useEffect(() => {
    setWaves(config.waves);
    setGlobalSpeed(config.globalSpeed);
    setNumWaves(config.numWaves);
    setSineWaves(config.sineWaves);
    setRenderConfig(config.renderConfig);
  }, [config]);

  const drawWave = useCallback((ctx: CanvasRenderingContext2D, wave: WaveParams, waveY: number) => {
    const startTime = performance.now();
    const points: [number, number][] = [];
    const canvas = ctx.canvas;
    
    // Calculate wave points
    for (let x = 0; x <= canvas.width; x += 2) {
      const primaryWave = Math.sin(
        x * wave.frequency * sineWaves.primary.frequency + 
        timeRef.current * wave.speed * globalSpeed * sineWaves.primary.speed
      ) * wave.amplitude * sineWaves.primary.amplitude;

      const secondaryWave = Math.sin(
        x * wave.frequency * sineWaves.secondary.frequency + 
        timeRef.current * wave.speed * globalSpeed * sineWaves.secondary.speed
      ) * wave.amplitude * sineWaves.secondary.amplitude;

      const tertiaryWave = Math.sin(
        x * wave.frequency * sineWaves.tertiary.frequency + 
        timeRef.current * wave.speed * globalSpeed * sineWaves.tertiary.speed
      ) * wave.amplitude * sineWaves.tertiary.amplitude;

      const y = waveY + (primaryWave + secondaryWave + tertiaryWave);
      points.push([x, y]);
    }

    if (DEBUG_PERFORMANCE) {
      metricsRef.current.waveCalculationTime += performance.now() - startTime;
    }

    // Create gradient for the wave
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    
    // Create sophisticated multi-stop gradient from wave colors
    const startRGB = hexToRGB(wave.startColor);
    const endRGB = hexToRGB(wave.endColor);
    
    // Add multiple color stops for sophisticated progression
    gradient.addColorStop(0, adjustColor(startRGB, 0.2));  // Nearly black with color tint
    gradient.addColorStop(0.2, adjustColor(startRGB, 0.4)); // Very dark
    gradient.addColorStop(0.4, adjustColor(startRGB, 0.6)); // Dark
    gradient.addColorStop(0.7, adjustColor(startRGB, 0.8)); // Medium
    gradient.addColorStop(0.9, wave.startColor);           // Original color
    gradient.addColorStop(1, wave.endColor);              // Brightest

    // Calculate the total height of all lines
    const totalHeight = (renderConfig.numLines - 1) * renderConfig.lineSpacing;
    const halfHeight = totalHeight / 2;

    // Draw multiple parallel lines
    for (let lineIndex = 0; lineIndex < renderConfig.numLines; lineIndex++) {
      // When spacing is 0, lines are consecutive pixels
      // When spacing is 1, there's 1 pixel gap between lines (so multiply by 2)
      // When spacing is 2, there's 2 pixel gap between lines (so multiply by 3)
      const lineOffset = -halfHeight + (lineIndex * (renderConfig.lineSpacing + 1));

      // Calculate opacity based on distance from center
      const distanceFromCenter = Math.abs(lineIndex - (renderConfig.numLines - 1) / 2) / ((renderConfig.numLines - 1) / 2);
      const opacity = 1;  //+ 0.05 + (0.30 * (1 - distanceFromCenter));

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
      ctx.lineWidth = renderConfig.lineWidth;
      ctx.globalAlpha = opacity;
      ctx.stroke();
    }

    if (DEBUG_PERFORMANCE) {
      metricsRef.current.renderCount++;
    }
  }, [sineWaves, globalSpeed]);

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
    const firstWaveMaxAmplitude = calculateMaxAmplitude(waves[0], sineWaves);
    const waveHeight = renderConfig.numLines * (renderConfig.lineWidth + renderConfig.lineSpacing) + renderConfig.waveSpacing
    const topspacing = firstWaveMaxAmplitude + 0.5 * waveHeight

    waves.slice(0, numWaves).forEach((wave, index) => {
      // Add amplitude padding to ALL waves to shift everything down
      const waveY =  index * (waveHeight);
      console.log(` Drawing wave ${index}/${numWaves} at Y position: ${waveY} waveHeight: ${waveHeight} firstWaveMaxAmplitude: ${firstWaveMaxAmplitude}`);
      drawWave(ctx, wave, waveY + topspacing);
    });

    // Increase animation speed by adjusting time increment
    timeRef.current += 0.016 * globalSpeed; // Adjusted for 60fps and using globalSpeed
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [drawWave]);

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

  const updateWave = useCallback((index: number, updates: Partial<WaveParams>) => {
    setWaves(prevWaves => {
      const newWaves = prevWaves.map((wave, i) => 
        i === index ? { ...wave, ...updates } : wave
      );
      return newWaves;
    });
  }, []);

  const updateSineWave = useCallback((type: 'primary' | 'secondary' | 'tertiary', updates: Partial<SineWaveComposition>) => {
    setSineWaves(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  }, []);

  const updateRenderConfig = useCallback((updates: Partial<typeof renderConfig>) => {
    setRenderConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => {
    setWaves(defaultConfig.waves);
    setGlobalSpeed(defaultConfig.globalSpeed);
    setNumWaves(defaultConfig.numWaves);
    setSineWaves(defaultConfig.sineWaves);
    setRenderConfig(defaultConfig.renderConfig);
  }, []);

  const handleDumpSettings = useCallback(() => {
    const config: WaveConfig = {
      waves: waves.slice(0, numWaves),
      globalSpeed,
      numWaves,
      sineWaves,
      renderConfig
    };
    
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));

    if (window.debug) {
      window.debug('Current Wave Configuration:');
      window.debug(JSON.stringify(config, null, 2));
    }
  }, [waves, globalSpeed, numWaves, sineWaves, renderConfig]);

  return (
    <div className="wave-container" ref={containerRef}>
      <canvas ref={canvasRef} className="wave-canvas" />
      {showControls && (
        <div className={`wave-control-panel ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="wave-control-handle" onClick={() => setIsCollapsed(!isCollapsed)}>
            <h3>Wave Controls</h3>
            <svg 
              className={`wave-control-arrow ${!isCollapsed ? 'up' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="control-section">
            <h3>Global Controls</h3>
            <div className="control-group">
              <label>
                Number of Waves:
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numWaves}
                  onChange={(e) => {
                    const newNumWaves = parseInt(e.target.value);
                    if (newNumWaves > waves.length) {
                      // Add new waves based on the last wave's configuration
                      const lastWave = waves[waves.length - 1];
                      const newWaves = [...waves];
                      for (let i = waves.length; i < newNumWaves; i++) {
                        const amplitudeDecrement = 5;
                        const frequencyIncrement = 0.0005;
                        const speedDecrement = 0.01;
                        
                        // Generate new colors by shifting hue
                        const hueStep = 30; // degrees
                        const startHue = (i * hueStep) % 360;
                        const endHue = ((i * hueStep) + 60) % 360;
                        
                        newWaves.push({
                          ...lastWave,
                          amplitude: Math.max(15, lastWave.amplitude - amplitudeDecrement),
                          frequency: lastWave.frequency + frequencyIncrement,
                          speed: Math.max(0.03, lastWave.speed - speedDecrement),
                          startColor: `hsl(${startHue}, 100%, 50%)`,
                          endColor: `hsl(${endHue}, 100%, 50%)`,
                          width: lastWave.width
                        });
                      }
                      setWaves(newWaves);
                    } else if (newNumWaves < waves.length) {
                      // Remove waves from the end
                      setWaves(waves.slice(0, newNumWaves));
                    }
                    setNumWaves(newNumWaves);
                  }}
                />
                <span>{numWaves}</span>
              </label>
            </div>
            <div className="control-group">
              <label>
                Animation Speed:
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={globalSpeed}
                  onChange={(e) => setGlobalSpeed(parseFloat(e.target.value))}
                />
                <span>{globalSpeed.toFixed(1)}x</span>
              </label>
            </div>
          </div>

          <div className="control-section">
            <h3>Wave Composition</h3>
            {(['primary', 'secondary', 'tertiary'] as const).map(type => (
              <div key={type} className="wave-controls">
                <h4>{type.charAt(0).toUpperCase() + type.slice(1)} Wave</h4>
                <div className="control-group">
                  <label>
                    Frequency Multiplier:
                    <input
                      type="range"
                      min="0.1"
                      max={type === 'primary' ? 2 : 5}
                      step="0.1"
                      value={sineWaves[type].frequency}
                      onChange={(e) => updateSineWave(type, { frequency: parseFloat(e.target.value) })}
                    />
                    <span>{sineWaves[type].frequency.toFixed(1)}x</span>
                  </label>
                </div>
                <div className="control-group">
                  <label>
                    Speed Multiplier:
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={sineWaves[type].speed}
                      onChange={(e) => updateSineWave(type, { speed: parseFloat(e.target.value) })}
                    />
                    <span>{sineWaves[type].speed.toFixed(1)}x</span>
                  </label>
                </div>
                <div className="control-group">
                  <label>
                    Amplitude:
                    <input
                      type="range"
                      min="0"
                      max={type === 'primary' ? 1 : 0.5}
                      step="0.05"
                      value={sineWaves[type].amplitude}
                      onChange={(e) => updateSineWave(type, { amplitude: parseFloat(e.target.value) })}
                    />
                    <span>{(sineWaves[type].amplitude * 100).toFixed(0)}%</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="control-section">
            <h3>Render Settings</h3>
            <div className="control-group">
              <label>
                Line Count:
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={renderConfig.numLines}
                  onChange={(e) => updateRenderConfig({ numLines: parseInt(e.target.value) })}
                />
                <span>{renderConfig.numLines}</span>
              </label>
            </div>
            <div className="control-group">
              <label>
                Line Width:
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={renderConfig.lineWidth}
                  onChange={(e) => updateRenderConfig({ lineWidth: parseFloat(e.target.value) })}
                />
                <span>{renderConfig.lineWidth.toFixed(1)}px</span>
              </label>
            </div>
            <div className="control-group">
              <label>
                Line Spacing:
                <input
                  type="range"
                  min="0"
                  max="5.0"
                  step="0.1"
                  value={renderConfig.lineSpacing}
                  onChange={(e) => updateRenderConfig({ lineSpacing: parseFloat(e.target.value) })}
                />
                <span>{renderConfig.lineSpacing.toFixed(1)}px</span>
              </label>
            </div>
            <div className="control-group">
              <label>
                Gradient Speed:
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={renderConfig.gradientPhaseSpeed}
                  onChange={(e) => updateRenderConfig({ gradientPhaseSpeed: parseFloat(e.target.value) })}
                />
                <span>{renderConfig.gradientPhaseSpeed.toFixed(1)}x</span>
              </label>
            </div>
            <div className="control-group">
              <label>
                Wave Spacing:
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={renderConfig.waveSpacing}
                  onChange={(e) => updateRenderConfig({ waveSpacing: parseInt(e.target.value) })}
                />
                <span>{renderConfig.waveSpacing}px</span>
              </label>
            </div>
          </div>

          <div className="control-section">
            <h3>Individual Waves</h3>
            {waves.slice(0, numWaves).map((wave, index) => (
              <div key={`wave-${index}`} className="wave-controls">
                <h4>Wave {index + 1}</h4>
                <div className="control-group">
                  <label>
                    Amplitude:
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={wave.amplitude}
                      onChange={(e) => updateWave(index, { amplitude: parseInt(e.target.value) })}
                    />
                    <span>{wave.amplitude}</span>
                  </label>
                </div>
                <div className="control-group">
                  <label>
                    Frequency:
                    <input
                      type="range"
                      min="0.001"
                      max="0.01"
                      step="0.0005"
                      value={wave.frequency}
                      onChange={(e) => updateWave(index, { frequency: parseFloat(e.target.value) })}
                    />
                    <span>{wave.frequency.toFixed(4)}</span>
                  </label>
                </div>
                <div className="control-group">
                  <label>
                    Speed:
                    <input
                      type="range"
                      min="0.01"
                      max="0.2"
                      step="0.01"
                      value={wave.speed}
                      onChange={(e) => updateWave(index, { speed: parseFloat(e.target.value) })}
                    />
                    <span>{wave.speed.toFixed(2)}</span>
                  </label>
                </div>
                <div className="control-group colors">
                  <label>
                    Start Color:
                    <input
                      type="color"
                      value={wave.startColor}
                      onChange={(e) => updateWave(index, { startColor: e.target.value })}
                    />
                  </label>
                  <label>
                    End Color:
                    <input
                      type="color"
                      value={wave.endColor}
                      onChange={(e) => updateWave(index, { endColor: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="button-group">
            <button 
              className="reset-button" 
              onClick={handleReset}
            >
              Reset to Default
            </button>
            <button 
              className="dump-button" 
              onClick={handleDumpSettings}
            >
              Dump Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaveBackground;