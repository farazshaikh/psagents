import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';

interface DebugEntry {
  message: string;
  timestamp: number;
  type: 'log' | 'error';
  stack?: string;
}

interface DebugConsoleProps {
  initialVisible?: boolean;
}

declare global {
  interface Window {
    debug?: (message: string) => void;
    debugError?: (error: Error | string, errorInfo?: string) => void;
  }
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ initialVisible = false }) => {
  const [logs, setLogs] = useState<DebugEntry[]>([]);
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [copyText, setCopyText] = useState('Copy Logs');
  const [unreadCount, setUnreadCount] = useState(0);

  const debug = useCallback((message: string) => {
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      console.log(message);
      setLogs(prevLogs => [...prevLogs, { message, timestamp: Date.now(), type: 'log' }]);
      if (!isVisible) {
        setUnreadCount(count => count + 1);
      }
    }
  }, [isVisible]);

  const debugError = useCallback((error: Error | string, errorInfo?: string) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : errorInfo;
    
    console.error(errorMessage);
    setLogs(prevLogs => [...prevLogs, {
      message: errorMessage,
      timestamp: Date.now(),
      type: 'error',
      stack: stackTrace
    }]);
    
    if (!isVisible) {
      setUnreadCount(count => count + 1);
    }
  }, [isVisible]);

  useEffect(() => {
    // Set up global handlers
    window.debug = debug;
    window.debugError = debugError;

    // Capture uncaught errors
    const errorHandler = (event: ErrorEvent) => {
      debugError(event.error || event.message);
    };

    // Capture unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      debugError(event.reason || 'Unhandled Promise Rejection');
    };

    // Store original console.error
    const originalConsoleError = console.error;
    
    // Override console.error but prevent recursion
    console.error = (...args) => {
      // Call original first
      originalConsoleError.apply(console, args);
      
      // Skip if the error is coming from our own debug system
      const errorString = args.join(' ');
      if (!errorString.includes('DebugConsole')) {
        setLogs(prevLogs => [...prevLogs, {
          message: errorString,
          timestamp: Date.now(),
          type: 'error'
        }]);
        
        if (!isVisible) {
          setUnreadCount(count => count + 1);
        }
      }
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      console.error = originalConsoleError;
      delete window.debug;
      delete window.debugError;
    };
  }, [debug, debugError, isVisible]);

  const handleCopyLogs = () => {
    const logText = logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const prefix = log.type === 'error' ? '[ERROR]' : '[LOG]';
      let text = `${prefix} [${timestamp}] ${log.message}`;
      if (log.stack) {
        text += '\n' + log.stack;
      }
      return text;
    }).join('\n');

    navigator.clipboard.writeText(logText).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy Logs'), 2000);
    });
  };

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => {
      const newState = !prev;
      // Emit custom event for state change
      window.dispatchEvent(new CustomEvent('debugConsoleStateChange', {
        detail: { expanded: newState }
      }));
      return newState;
    });
  }, []);

  // Emit initial state on mount
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('debugConsoleStateChange', {
      detail: { expanded: isVisible }
    }));
  }, [isVisible]);

  return (
    <div className={`${styles.debugWrapper} ${isVisible ? styles.expanded : styles.collapsed}`}>
      <div className={styles.debugHandle} onClick={toggleVisibility}>
        <div className={styles.debugHandleLeft}>
          <span className={styles.debugHandleText}>
            Debug Console
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount}</span>
            )}
          </span>
          <span className={styles.copyLogs} onClick={(e) => { e.stopPropagation(); handleCopyLogs(); }}>
            {copyText}
          </span>
        </div>
      </div>
      <div className={styles.debugConsole}>
        {logs.map((log, index) => (
          <div key={index} className={`${styles.debugEntry} ${log.type === 'error' ? styles.errorEntry : ''}`}>
            [{new Date(log.timestamp).toISOString()}] {log.message}
            {log.stack && (
              <div className={styles.stackTrace}>{log.stack}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugConsole; 