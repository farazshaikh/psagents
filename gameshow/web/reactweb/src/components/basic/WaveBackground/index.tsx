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
const DEBUG_PERFORMANCE = true;

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

  const drawWave = useCallback((ctx: CanvasRenderingContext2D, wave: WaveParams, timeOffset: number) => {
    const startTime = performance.now();
    const points: [number, number][] = [];
    const canvas = ctx.canvas;
    
    for (let x = 0; x <= canvas.width; x += 2) {
      const primaryWave = Math.sin(
        x * wave.frequency * sineWaves.primary.frequency + 
        timeRef.current * wave.speed * globalSpeed * sineWaves.primary.speed
      ) * sineWaves.primary.amplitude;

      const secondaryWave = Math.sin(
        x * wave.frequency * sineWaves.secondary.frequency + 
        (timeRef.current + timeOffset) * wave.speed * globalSpeed * sineWaves.secondary.speed
      ) * sineWaves.secondary.amplitude;

      const tertiaryWave = Math.sin(
        x * wave.frequency * sineWaves.tertiary.frequency + 
        timeRef.current * wave.speed * globalSpeed * sineWaves.tertiary.speed
      ) * sineWaves.tertiary.amplitude;

      const y = canvas.height * wave.baseY + 
               wave.amplitude * (primaryWave + secondaryWave + tertiaryWave);
      points.push([x, y]);
    }

    if (DEBUG_PERFORMANCE) {
      metricsRef.current.waveCalculationTime += performance.now() - startTime;
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1] - wave.width);
    
    for (let i = 1; i < points.length - 2; i++) {
      const xc = (points[i][0] + points[i + 1][0]) / 2;
      const yc = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1] - wave.width, xc, yc - wave.width);
    }
    
    for (let i = points.length - 2; i > 0; i--) {
      const xc = (points[i][0] + points[i - 1][0]) / 2;
      const yc = (points[i][1] + points[i - 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1] + wave.width, xc, yc + wave.width);
    }
    
    ctx.closePath();
    ctx.clip();

    const colorGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    
    // Add multiple color stops for cubic-like effect
    // Using the same base color (#4A90E2 - blue) but with different brightness/saturation
    colorGradient.addColorStop(0, '#050A14');    // Nearly black with slight blue tint
    colorGradient.addColorStop(0.2, '#0A1A2B');  // Very dark blue-black
    colorGradient.addColorStop(0.4, '#1A3251');  // Dark blue
    colorGradient.addColorStop(0.7, '#2B5486');  // Medium-dark blue
    colorGradient.addColorStop(0.9, '#4A90E2');  // Original bright blue
    colorGradient.addColorStop(1, '#66A5F2');    // Brightest, saturated blue

    for (let i = 0; i < renderConfig.numLines; i++) {
      // Calculate the total line space and spacing
      const totalLineSpace = renderConfig.numLines * renderConfig.lineWidth;
      const totalGapSpace = (renderConfig.numLines - 1) * renderConfig.lineSpacing;
      const totalHeight = totalLineSpace + totalGapSpace;
      
      // Calculate the starting position to center all lines
      const startY = -totalHeight / 2;

      // Debug log for line positions
      if (window.debug) {
        window.debug(`Drawing ${renderConfig.numLines} lines`);
        window.debug(`Total height: ${totalHeight}px`);
        window.debug(`Start Y: ${startY}px`);
      }
      
      // Calculate exact y position for this line including width and spacing
      const y = startY + (i * (renderConfig.lineWidth + renderConfig.lineSpacing));
      
      if (window.debug) {
        window.debug(`Line ${i} Y offset: ${y}px`);
      }

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1] + y);
      
      // Simplified path for debugging - just draw straight lines
      for (let j = 1; j < points.length; j++) {
        ctx.lineTo(points[j][0], points[j][1] + y);
      }
      
      ctx.strokeStyle = colorGradient;
      ctx.lineWidth = renderConfig.lineWidth;
      ctx.globalAlpha = 1.0; // Full opacity for debugging
      
      if (window.debug) {
        window.debug(`Drawing line ${i} with color ${wave.startColor}`);
      }
      
      ctx.stroke();
    }

    ctx.restore();

    if (DEBUG_PERFORMANCE) {
      metricsRef.current.renderCount++;
    }
  }, [globalSpeed, sineWaves, renderConfig]);

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

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /**
     * Horizontal Color Gradient Setup
     * Creates a sophisticated progression from near-black to bright blue
     * More color stops are used in the darker range (0-70%) to create
     * subtle transitions, while the bright range is compressed (70-100%)
     * for dramatic effect at the end
     */
    const colorGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    
    // Carefully chosen color stops for smooth progression from dark to bright
    colorGradient.addColorStop(0, '#050A14');    // Nearly black with slight blue tint
    colorGradient.addColorStop(0.2, '#0A1A2B');  // Very dark blue-black
    colorGradient.addColorStop(0.4, '#1A3251');  // Dark blue
    colorGradient.addColorStop(0.7, '#2B5486');  // Medium-dark blue
    colorGradient.addColorStop(0.9, '#4A90E2');  // Original bright blue
    colorGradient.addColorStop(1, '#66A5F2');    // Brightest, saturated blue

    // Calculate total height needed for all lines
    const totalHeight = (renderConfig.numLines - 1) * renderConfig.lineSpacing;
    const centerY = canvas.height * 0.5;
    const startY = centerY - (totalHeight / 2);

    // Calculate center line index for opacity gradient
    const centerLineIndex = Math.floor(renderConfig.numLines / 2);

    // Draw lines
    for (let i = 0; i < renderConfig.numLines; i++) {
      const lineY = startY + (i * renderConfig.lineSpacing);
      
      /**
       * Vertical Opacity Gradient Calculation
       * Creates a subtle 3D tube effect by varying opacity from edges to center
       * - Uses linear interpolation for smooth transitions
       * - Starts at 5% opacity at edges
       * - Peaks at 35% opacity in center
       * - Linear falloff creates natural-looking depth
       */
      const distanceFromCenter = Math.abs(i - centerLineIndex) / centerLineIndex;
      const opacity = 0.05 + (0.30 * (1 - distanceFromCenter));

      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.strokeStyle = colorGradient;
      ctx.lineWidth = renderConfig.lineWidth;
      ctx.globalAlpha = opacity;
      ctx.stroke();
    }

    timeRef.current += 0.08;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
                        const baseYIncrement = 0.05;
                        const amplitudeDecrement = 5;
                        const frequencyIncrement = 0.0005;
                        const speedDecrement = 0.01;
                        
                        // Generate new colors by shifting hue
                        const hueStep = 30; // degrees
                        const startHue = (i * hueStep) % 360;
                        const endHue = ((i * hueStep) + 60) % 360;
                        
                        newWaves.push({
                          ...lastWave,
                          baseY: Math.min(0.95, lastWave.baseY + baseYIncrement),
                          amplitude: Math.max(15, lastWave.amplitude - amplitudeDecrement),
                          frequency: lastWave.frequency + frequencyIncrement,
                          speed: Math.max(0.03, lastWave.speed - speedDecrement),
                          startColor: `hsl(${startHue}, 100%, 50%)`,
                          endColor: `hsl(${endHue}, 100%, 50%)`,
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