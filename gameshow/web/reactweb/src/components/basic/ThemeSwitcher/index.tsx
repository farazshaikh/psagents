import React from 'react';
import './styles.css';

interface ThemeSwitcherProps {
  isDark: boolean;
  onToggle: () => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ isDark, onToggle }) => {
  return (
    <div className="theme-switcher">
      <label className="switch">
        <input
          type="checkbox"
          checked={isDark}
          onChange={onToggle}
          aria-label="Toggle theme"
        />
        <span className="slider">
          <span className="icon">🌙</span>
          <span className="icon">☀️</span>
        </span>
      </label>
    </div>
  );
};

export default ThemeSwitcher; 