import React, { useState, useCallback } from 'react';
import { WaveParams, WaveConfig, defaultConfig, SineWaveComposition, RenderConfig } from '../WaveBackground/config';
import WaveBackground from '../WaveBackground';
import './styles.css';

interface WaveBackgroundControlPanelProps {
  config: WaveConfig;
  onConfigChange?: (config: WaveConfig) => void;
}

const generateRandomWaveParams = (): WaveParams => ({
  amplitude: Math.floor(Math.random() * 50) + 10, // 10-60
  frequency: (Math.random() * 0.009) + 0.001, // 0.001-0.01
  speed: (Math.random() * 0.19) + 0.01, // 0.01-0.2
  startColor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
  endColor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
});

const WaveBackgroundControlPanel: React.FC<WaveBackgroundControlPanelProps> = ({
  config,
  onConfigChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const updateConfig = useCallback((updates: Partial<WaveConfig>) => {
    const newConfig = { ...config, ...updates };
    onConfigChange?.(newConfig);
  }, [config, onConfigChange]);

  const handleNumWavesChange = useCallback((newNumWaves: number) => {
    let newWaves = [...config.waves];
    if (newNumWaves > config.waves.length) {
      // Add waves
      while (newWaves.length < newNumWaves) {
        const sourceWave = newWaves[newWaves.length - 1];
        const newWave = { ...sourceWave }; // Clone the last wave
        newWaves.push(newWave);
      }
    } else {
      // Remove waves
      newWaves = newWaves.slice(0, newNumWaves);
    }
    updateConfig({ waves: newWaves, numWaves: newNumWaves });
  }, [config, updateConfig]);

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

        {/* Global Settings Section */}
        <div className="control-section">
          <h3>Global Settings</h3>
          <div className="control-group">
            <label>
              Number of Waves:
              <input
                type="range"
                min="1"
                max="10"
                value={config.numWaves}
                onChange={(e) => handleNumWavesChange(parseInt(e.target.value))}
              />
              <span>{config.numWaves}</span>
            </label>
          </div>
          <div className="control-group">
            <label>
              Global Speed:
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

        {/* Sine Waves Section */}
        <div className="control-section">
          <h3>Sine Wave Composition</h3>
          {(['primary', 'secondary', 'tertiary'] as const).map(type => (
            <div key={type} className="wave-controls">
              <h4>{type.charAt(0).toUpperCase() + type.slice(1)} Wave</h4>
              <div className="control-group">
                <label>
                  Frequency:
                  <input
                    type="range"
                    min="0.1"
                    max={type === 'primary' ? 2 : 5}
                    step="0.1"
                    value={config.sineWaves[type].frequency}
                    onChange={(e) => updateConfig({
                      sineWaves: {
                        ...config.sineWaves,
                        [type]: { ...config.sineWaves[type], frequency: parseFloat(e.target.value) }
                      }
                    })}
                  />
                  <span>{config.sineWaves[type].frequency.toFixed(1)}x</span>
                </label>
              </div>
              <div className="control-group">
                <label>
                  Speed:
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={config.sineWaves[type].speed}
                    onChange={(e) => updateConfig({
                      sineWaves: {
                        ...config.sineWaves,
                        [type]: { ...config.sineWaves[type], speed: parseFloat(e.target.value) }
                      }
                    })}
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
                    onChange={(e) => updateConfig({
                      sineWaves: {
                        ...config.sineWaves,
                        [type]: { ...config.sineWaves[type], amplitude: parseFloat(e.target.value) }
                      }
                    })}
                  />
                  <span>{(config.sineWaves[type].amplitude * 100).toFixed(0)}%</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Render Settings Section */}
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
                onChange={(e) => updateConfig({
                  renderConfig: { ...config.renderConfig, numLines: parseInt(e.target.value) }
                })}
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
                onChange={(e) => updateConfig({
                  renderConfig: { ...config.renderConfig, lineWidth: parseFloat(e.target.value) }
                })}
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
                onChange={(e) => updateConfig({
                  renderConfig: { ...config.renderConfig, lineSpacing: parseFloat(e.target.value) }
                })}
              />
              <span>{config.renderConfig.lineSpacing.toFixed(1)}px</span>
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
                onChange={(e) => updateConfig({
                  renderConfig: { ...config.renderConfig, waveSpacing: parseInt(e.target.value) }
                })}
              />
              <span>{config.renderConfig.waveSpacing}px</span>
            </label>
          </div>
        </div>

        <div className="button-group">
          <button
            className="reset-button"
            onClick={() => updateConfig(defaultConfig)}
          >
            Reset to Default
          </button>
          <button
            className="dump-button"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(config, null, 2));
              if (window.debug) {
                window.debug('Current Wave Configuration:');
                window.debug(JSON.stringify(config, null, 2));
              }
            }}
          >
            Dump Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaveBackgroundControlPanel;