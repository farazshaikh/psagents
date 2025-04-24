import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';

interface DebugEntry {
  message: string;
  timestamp: number;
}

interface DebugConsoleProps {
  initialVisible?: boolean;
}

declare global {
  interface Window {
    debug?: (message: string) => void;
  }
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ initialVisible = false }) => {
  const [logs, setLogs] = useState<DebugEntry[]>([]);
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [copyText, setCopyText] = useState('Copy Logs');

  const debug = useCallback((message: string) => {
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      console.log(message);
      setLogs(prevLogs => [...prevLogs, { message, timestamp: Date.now() }]);
    }
  }, []);

  useEffect(() => {
    window.debug = debug;
    return () => {
      delete window.debug;
    };
  }, [debug]);

  const handleCopyLogs = () => {
    const logText = logs.map(log => `[${new Date(log.timestamp).toISOString()}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy Logs'), 2000);
    });
  };

  return (
    <div className={`${styles.debugWrapper} ${isVisible ? styles.expanded : styles.collapsed}`}>
      <div className={styles.debugHandle} onClick={() => setIsVisible(!isVisible)}>
        <div className={styles.debugHandleLeft}>
          <span className={styles.debugHandleText}>Debug Console</span>
          <span className={styles.copyLogs} onClick={(e) => { e.stopPropagation(); handleCopyLogs(); }}>
            {copyText}
          </span>
        </div>
      </div>
      <div className={styles.debugConsole}>
        {logs.map((log, index) => (
          <div key={index} className={styles.debugEntry}>
            [{new Date(log.timestamp).toISOString()}] {log.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugConsole; 