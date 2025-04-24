import React, { useState, useEffect } from 'react';
import { useFeatureFlags } from '../../../utils/featureFlags';
import './styles.css';

interface DebugEntry {
  message: string;
  timestamp: number;
}

interface DebugConsoleProps {
  initialVisible?: boolean;
}

// Create a global window property for the debug function
declare global {
  interface Window {
    showDebug: ((message: string) => void) | undefined;
  }
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ initialVisible = false }) => {
  const { debugConsole } = useFeatureFlags();
  const [logs, setLogs] = useState<DebugEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(initialVisible);
  const [copyText, setCopyText] = useState('Copy Logs');
  
  useEffect(() => {
    if (!debugConsole) return;
    
    // Initialize the global debug function
    const debugFunction = (message: string) => {
      console.log(message); // Also log to browser console
      setLogs(prevLogs => [...prevLogs, {
        message,
        timestamp: Date.now()
      }]);
    };

    window.showDebug = debugFunction;

    return () => {
      // Clean up by setting the property to undefined
      window.showDebug = undefined;
    };
  }, [debugConsole]);

  // If debug console is disabled, render nothing
  if (!debugConsole) return null;

  const handleCopyLogs = () => {
    const logText = logs.map(log => log.message).join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy Logs'), 2000);
    });
  };

  const toggleConsole = () => setIsExpanded(!isExpanded);

  return (
    <div className={`debug-wrapper ${isExpanded ? 'expanded' : ''}`}>
      <div className="debug-handle">
        <div className="debug-handle-left">
          <span className="debug-handle-text" onClick={toggleConsole}>
            Debug Console {isExpanded ? '▼' : '▲'}
          </span>
          <span className="copy-logs" onClick={handleCopyLogs}>
            {copyText}
          </span>
        </div>
      </div>
      <div className="debug-console">
        {logs.map((log, index) => (
          <div key={`${log.timestamp}-${index}`} className="debug-entry">
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}; 