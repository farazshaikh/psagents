import React, { useEffect, useRef, useState } from 'react';
import './styles.css';

interface WaveBackgroundProps {
  panel?: boolean;
}

interface WaveParams {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  startColor: string;
  endColor: string;
  width: number;
}

const defaultWaves: WaveParams[] = [
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
];

const WaveBackground: React.FC<WaveBackgroundProps> = ({ panel = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waves, setWaves] = useState<WaveParams[]>(defaultWaves);
  const [globalSpeed, setGlobalSpeed] = useState(1);
  const [numWaves, setNumWaves] = useState(5);

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

    const drawWave = (wave: WaveParams, timeOffset: number) => {
      const points: [number, number][] = [];
      
      for (let x = 0; x <= canvas.width; x += 2) {
        const primaryWave = Math.sin(x * wave.frequency + time * wave.speed * globalSpeed);
        const secondaryWave = Math.sin(x * wave.frequency * 1.5 + (time + timeOffset) * wave.speed * globalSpeed * 0.7) * 0.4;
        const tertiaryWave = Math.sin(x * wave.frequency * 3 + time * wave.speed * globalSpeed * 0.5) * 0.2;
        const y = canvas.height * wave.baseY + 
                 wave.amplitude * (primaryWave + secondaryWave + tertiaryWave);
        points.push([x, y]);
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
      const gradientPhase = Math.sin(time * wave.speed * 0.5);
      const midPoint = 0.5 + 0.2 * gradientPhase;
      
      colorGradient.addColorStop(0, wave.startColor);
      colorGradient.addColorStop(0.2, wave.startColor);
      colorGradient.addColorStop(midPoint, wave.endColor);
      colorGradient.addColorStop(0.8, wave.endColor);
      colorGradient.addColorStop(1, wave.endColor);

      const numLines = 20;
      for (let i = 0; i < numLines; i++) {
        const t = i / (numLines - 1);
        const y = wave.width * (2 * t - 1);
        
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1] + y);
        
        for (let j = 1; j < points.length - 2; j++) {
          const xc = (points[j][0] + points[j + 1][0]) / 2;
          const yc = (points[j][1] + points[j + 1][1]) / 2;
          ctx.quadraticCurveTo(points[j][0], points[j][1] + y, xc, yc + y);
        }
        
        ctx.strokeStyle = colorGradient;
        ctx.lineWidth = 1.5;
        
        const normalizedT = Math.abs(2 * t - 1);
        const opacity = 0.2 * (1 - normalizedT * normalizedT);
        ctx.globalAlpha = opacity;
        ctx.stroke();
      }

      ctx.restore();
    };

    let time = 0;
    const animate = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter';
      waves.slice(0, numWaves).forEach((wave, index) => {
        drawWave(wave, index * Math.PI / waves.length);
      });
      ctx.globalCompositeOperation = 'source-over';

      time += 0.08;
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [waves, globalSpeed, numWaves]);

  const updateWave = (index: number, updates: Partial<WaveParams>) => {
    setWaves(prevWaves => 
      prevWaves.map((wave, i) => 
        i === index ? { ...wave, ...updates } : wave
      )
    );
  };

  return (
    <div className="wave-container">
      <canvas ref={canvasRef} className="wave-canvas" />
      {panel && (
        <div className="wave-control-panel">
          <div className="control-section">
            <h3>Global Controls</h3>
            <div className="control-group">
              <label>
                Number of Waves:
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={numWaves}
                  onChange={(e) => setNumWaves(parseInt(e.target.value))}
                />
                <span>{numWaves}</span>
              </label>
            </div>
            <div className="control-group">
              <label>
                Animation Speed:
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={globalSpeed}
                  onChange={(e) => setGlobalSpeed(parseFloat(e.target.value))}
                />
                <span>{globalSpeed.toFixed(1)}x</span>
              </label>
            </div>
          </div>
          <div className="control-section">
            <h3>Wave Controls</h3>
            {waves.slice(0, numWaves).map((wave, index) => (
              <div key={index} className="wave-controls">
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
          <button className="reset-button" onClick={() => {
            setWaves(defaultWaves);
            setGlobalSpeed(1);
            setNumWaves(5);
          }}>
            Reset to Default
          </button>
        </div>
      )}
    </div>
  );
};

export default WaveBackground;