import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFeatureFlags } from '../../../utils/featureFlags';
import { WaveParams, WaveConfig, defaultConfig, SineWaveComposition } from './config';
import { startConfig } from './startConfig';
import './styles.css';

interface WaveBackgroundProps {
  panel?: boolean;
  config?: WaveConfig;
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

// Animation states
enum AnimationState {
  InitialStatic,      // Initial state of no movement
  ToAnimated,         // Transition to animated state
  Animated,           // Fully animated state
  ToStatic,          // Transition back to static state
  Static             // Fully static state
}

// Animation timing constants
const STATIC_DURATION = 7500;        // Duration to stay in static state
const ANIMATED_DURATION = 7500;      // Duration to stay in animated state
const TRANSITION_DURATION = 10000;   // Duration for transitions (10 seconds for very smooth transitions)
const BLEND_DURATION = 2500;         // Duration to blend between states

const WaveBackground: React.FC<WaveBackgroundProps> = ({ 
  panel = false, 
  config = defaultConfig,
  initialCollapsed = true 
}) => {
  const { waveController } = useFeatureFlags();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const [waves, setWaves] = useState<WaveParams[]>(startConfig.waves);
  const [globalSpeed, setGlobalSpeed] = useState(startConfig.globalSpeed);
  const [numWaves, setNumWaves] = useState(startConfig.numWaves);
  const [sineWaves, setSineWaves] = useState(startConfig.sineWaves);
  const [renderConfig, setRenderConfig] = useState(startConfig.renderConfig);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [animationState, setAnimationState] = useState<AnimationState>(AnimationState.InitialStatic);
  const showControls = waveController || panel;
  const lastValuesRef = useRef<{
    globalSpeed: number;
    waves: WaveParams[];
    sineWaves: typeof startConfig.sineWaves;
  }>({
    globalSpeed: startConfig.globalSpeed,
    waves: startConfig.waves,
    sineWaves: startConfig.sineWaves
  });

  // Add interpolation effect
  useEffect(() => {
    // Ultra smooth easing function
    const smoothEase = (x: number): number => {
      // Combine smoothstep with extra smoothing at the edges
      const t = x * x * x * (x * (x * 6 - 15) + 10); // smoothstep
      return t * t * (3 - 2 * t); // extra smoothing
    };

    // Animation timing constants
    const CYCLE_DURATION = 15000;    // Total duration of one full cycle
    const TRANSITION_TIME = 0.4;     // Portion of cycle spent transitioning (40%)

    const interpolateConfig = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const cycleTime = (elapsed % CYCLE_DURATION) / CYCLE_DURATION;

      // Calculate the animation phase (0 to 1)
      let t: number;
      if (cycleTime < TRANSITION_TIME) {
        // Transitioning up
        t = smoothEase(cycleTime / TRANSITION_TIME);
      } else if (cycleTime < 1 - TRANSITION_TIME) {
        // Hold at peak
        t = 1;
      } else {
        // Transitioning down
        t = smoothEase(1 - (cycleTime - (1 - TRANSITION_TIME)) / TRANSITION_TIME);
      }

      if (window.debug && elapsed % 500 < 16) {
        window.debug(`Animation Progress: cycleTime=${Math.round(cycleTime * 100)}% t=${Math.round(t * 100)}% frameTime=${now - lastFrameTimeRef.current}ms`);
        window.debug(`Animation Values: globalSpeed=${Math.round(lerp(startConfig.globalSpeed, config.globalSpeed, t) * 100) / 100} amplitude=${Math.round(lerp(startConfig.waves[0].amplitude, config.waves[0].amplitude, t) * 100) / 100}`);
      }

      // Interpolate wave parameters
      setWaves(waves.map((wave, index) => {
        const startWave = startConfig.waves[index];
        const finalWave = config.waves[index];
        return {
          ...wave,
          amplitude: lerp(startWave.amplitude, finalWave.amplitude, t),
          frequency: lerp(startWave.frequency, finalWave.frequency, t),
          speed: lerp(startWave.speed, finalWave.speed, t)
        };
      }));

      setGlobalSpeed(lerp(startConfig.globalSpeed, config.globalSpeed, t));

      setSineWaves({
        primary: {
          frequency: lerp(startConfig.sineWaves.primary.frequency, config.sineWaves.primary.frequency, t),
          speed: lerp(startConfig.sineWaves.primary.speed, config.sineWaves.primary.speed, t),
          amplitude: lerp(startConfig.sineWaves.primary.amplitude, config.sineWaves.primary.amplitude, t)
        },
        secondary: {
          frequency: lerp(startConfig.sineWaves.secondary.frequency, config.sineWaves.secondary.frequency, t),
          speed: lerp(startConfig.sineWaves.secondary.speed, config.sineWaves.secondary.speed, t),
          amplitude: lerp(startConfig.sineWaves.secondary.amplitude, config.sineWaves.secondary.amplitude, t)
        },
        tertiary: {
          frequency: lerp(startConfig.sineWaves.tertiary.frequency, config.sineWaves.tertiary.frequency, t),
          speed: lerp(startConfig.sineWaves.tertiary.speed, config.sineWaves.tertiary.speed, t),
          amplitude: lerp(startConfig.sineWaves.tertiary.amplitude, config.sineWaves.tertiary.amplitude, t)
        }
      });

      requestAnimationFrame(interpolateConfig);
    };

    interpolateConfig();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [config]);

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

  // Listen for debug console state changes
  useEffect(() => {
    const handleDebugConsoleChange = (event: CustomEvent) => {
      if (containerRef.current) {
        if (event.detail.expanded) {
          containerRef.current.classList.add('debug-expanded');
        } else {
          containerRef.current.classList.remove('debug-expanded');
        }
      }
    };

    // Check initial debug console state
    const debugConsole = document.querySelector('[class*="debugWrapper"]');
    if (debugConsole?.classList.contains('expanded') && containerRef.current) {
      containerRef.current.classList.add('debug-expanded');
    }

    window.addEventListener('debugConsoleStateChange' as any, handleDebugConsoleChange);
    
    return () => {
      window.removeEventListener('debugConsoleStateChange' as any, handleDebugConsoleChange);
    };
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
    const gradientPhase = Math.sin(timeRef.current * wave.speed * renderConfig.gradientPhaseSpeed);
    const midPoint = 0.5 + 0.2 * gradientPhase;
    
    colorGradient.addColorStop(0, wave.startColor);
    colorGradient.addColorStop(0.2, wave.startColor);
    colorGradient.addColorStop(midPoint, wave.endColor);
    colorGradient.addColorStop(0.8, wave.endColor);
    colorGradient.addColorStop(1, wave.endColor);

    for (let i = 0; i < renderConfig.numLines; i++) {
      // Calculate the total space taken by all lines and gaps
      const totalSpace = wave.width * 2; // Total height available
      const totalLineSpace = renderConfig.numLines * renderConfig.lineWidth;
      const totalGapSpace = (renderConfig.numLines - 1) * renderConfig.lineSpacing;
      const totalHeight = totalLineSpace + totalGapSpace;
      
      // Calculate the starting position to center all lines
      const startY = -totalHeight / 2;
      
      // Calculate exact y position for this line including width and spacing
      const y = startY + (i * (renderConfig.lineWidth + renderConfig.lineSpacing)) + (renderConfig.lineWidth / 2);
      
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1] + y);
      
      for (let j = 1; j < points.length - 2; j++) {
        const xc = (points[j][0] + points[j + 1][0]) / 2;
        const yc = (points[j][1] + points[j + 1][1]) / 2;
        ctx.quadraticCurveTo(points[j][0], points[j][1] + y, xc, yc + y);
      }
      
      ctx.strokeStyle = colorGradient;
      ctx.lineWidth = renderConfig.lineWidth;
      
      // Calculate opacity based on normalized position
      const normalizedPosition = (y - startY) / totalHeight;
      const normalizedT = Math.abs(2 * normalizedPosition - 1);
      const opacity = 0.2 * (1 - normalizedT * normalizedT);
      ctx.globalAlpha = opacity;
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

    ctx.globalCompositeOperation = 'lighter';
    waves.slice(0, numWaves).forEach((wave, index) => {
      drawWave(ctx, wave, index * Math.PI / waves.length);
    });
    ctx.globalCompositeOperation = 'source-over';

    timeRef.current += 0.08;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [waves, numWaves, drawWave]);

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