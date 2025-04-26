import React, { useState, useCallback } from 'react';
import { WaveParams, WaveConfig, defaultConfig, SineWaveComposition, RenderConfig } from '../WaveBackground/config';
import WaveBackground from '../WaveBackground';
import './styles.css';

interface WaveBackgroundControlPanelProps {
  config: WaveConfig;
  initialCollapsed?: boolean;
  onConfigChange?: (config: WaveConfig) => void;
}

const WaveBackgroundControlPanel: React.FC<WaveBackgroundControlPanelProps> = ({
  config: initialConfig,
  initialCollapsed = true,
  onConfigChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [config, setConfig] = useState(initialConfig);

  const updateConfig = useCallback((updates: Partial<WaveConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [config, onConfigChange]);

  const updateWave = useCallback((updates: Partial<WaveParams>) => {
    updateConfig({
      waves: [{ ...config.waves[0], ...updates }]
    });
  }, [config, updateConfig]);

  const updateSineWave = useCallback((type: 'primary' | 'secondary' | 'tertiary', updates: Partial<SineWaveComposition>) => {
    updateConfig({
      sineWaves: {
        ...config.sineWaves,
        [type]: { ...config.sineWaves[type], ...updates }
      }
    });
  }, [config, updateConfig]);

  const updateRenderConfig = useCallback((updates: Partial<RenderConfig>) => {
    updateConfig({
      renderConfig: { ...config.renderConfig, ...updates }
    });
  }, [config, updateConfig]);

  const handleReset = useCallback(() => {
    const resetConfig = {
      ...defaultConfig,
      waves: [defaultConfig.waves[0]],
      numWaves: 1
    };
    setConfig(resetConfig);
    onConfigChange?.(resetConfig);
  }, [onConfigChange]);

  const handleDumpSettings = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));

    if (window.debug) {
      window.debug('Current Wave Configuration:');
      window.debug(JSON.stringify(config, null, 2));
    }
  }, [config]);

  return (
    <div className="wave-background-control-panel-container">
      <WaveBackground config={config} />
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
              Animation Speed:
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={config.globalSpeed}
                onChange={(e) => updateConfig({ globalSpeed: parseFloat(e.target.value) })}
              />
              <span>{config.globalSpeed.toFixed(1)}x</span>
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
                    value={config.sineWaves[type].frequency}
                    onChange={(e) => updateSineWave(type, { frequency: parseFloat(e.target.value) })}
                  />
                  <span>{config.sineWaves[type].frequency.toFixed(1)}x</span>
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
                    value={config.sineWaves[type].speed}
                    onChange={(e) => updateSineWave(type, { speed: parseFloat(e.target.value) })}
                  />
                  <span>{config.sineWaves[type].speed.toFixed(1)}x</span>
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
                    value={config.sineWaves[type].amplitude}
                    onChange={(e) => updateSineWave(type, { amplitude: parseFloat(e.target.value) })}
                  />
                  <span>{(config.sineWaves[type].amplitude * 100).toFixed(0)}%</span>
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
                value={config.renderConfig.numLines}
                onChange={(e) => updateRenderConfig({ numLines: parseInt(e.target.value) })}
              />
              <span>{config.renderConfig.numLines}</span>
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
                value={config.renderConfig.lineWidth}
                onChange={(e) => updateRenderConfig({ lineWidth: parseFloat(e.target.value) })}
              />
              <span>{config.renderConfig.lineWidth.toFixed(1)}px</span>
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
                value={config.renderConfig.lineSpacing}
                onChange={(e) => updateRenderConfig({ lineSpacing: parseFloat(e.target.value) })}
              />
              <span>{config.renderConfig.lineSpacing.toFixed(1)}px</span>
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
                value={config.renderConfig.gradientPhaseSpeed}
                onChange={(e) => updateRenderConfig({ gradientPhaseSpeed: parseFloat(e.target.value) })}
              />
              <span>{config.renderConfig.gradientPhaseSpeed.toFixed(1)}x</span>
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
                value={config.renderConfig.waveSpacing}
                onChange={(e) => updateRenderConfig({ waveSpacing: parseInt(e.target.value) })}
              />
              <span>{config.renderConfig.waveSpacing}px</span>
            </label>
          </div>
        </div>

        <div className="control-section">
          <h3>Wave Parameters</h3>
          <div className="wave-controls">
            <div className="control-group">
              <label>
                Amplitude:
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={config.waves[0].amplitude}
                  onChange={(e) => updateWave({ amplitude: parseInt(e.target.value) })}
                />
                <span>{config.waves[0].amplitude}</span>
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
                  value={config.waves[0].frequency}
                  onChange={(e) => updateWave({ frequency: parseFloat(e.target.value) })}
                />
                <span>{config.waves[0].frequency.toFixed(4)}</span>
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
                  value={config.waves[0].speed}
                  onChange={(e) => updateWave({ speed: parseFloat(e.target.value) })}
                />
                <span>{config.waves[0].speed.toFixed(2)}</span>
              </label>
            </div>
            <div className="control-group colors">
              <label>
                Start Color:
                <input
                  type="color"
                  value={config.waves[0].startColor}
                  onChange={(e) => updateWave({ startColor: e.target.value })}
                />
              </label>
              <label>
                End Color:
                <input
                  type="color"
                  value={config.waves[0].endColor}
                  onChange={(e) => updateWave({ endColor: e.target.value })}
                />
              </label>
            </div>
          </div>
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
    </div>
  );
};

export default WaveBackgroundControlPanel;