import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../basic/ThemeProvider';
import Typography from '../Typography';
import './styles.css';

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
  const { theme } = useTheme();
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
      // Clear unread count when expanding
      if (newState) {
        setUnreadCount(0);
      }
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
    <div
      className={`debugWrapper ${isVisible ? 'expanded' : 'collapsed'}`}
      style={{
        backgroundColor: theme.colors.bg.overlay,
        color: theme.colors.fg.primary
      }}
    >
      <div
        className="debugHandle"
        onClick={toggleVisibility}
      >
        <div className="debugHandleLeft">
          <Typography
            variant="subtitle2"
            component="span"
            className="debugHandleText"
          >
            Debug Console
            {unreadCount > 0 && (
              <span
                className="unreadBadge"
                style={{
                  backgroundColor: theme.colors.accent.primary,
                  color: theme.colors.fg.inverse
                }}
              >
                {unreadCount}
              </span>
            )}
          </Typography>
          <Typography
            variant="caption"
            component="span"
            className="copyLogs"
            onClick={(e) => { e.stopPropagation(); handleCopyLogs(); }}
            style={{
              color: theme.colors.fg.primary,
              backgroundColor: `${theme.colors.fg.primary}1A` // 10% opacity of text color
            }}
          >
            {copyText}
          </Typography>
        </div>
      </div>
      <div
        className="debugConsole"
        style={{
          backgroundColor: theme.colors.bg.secondary
        }}
      >
        {logs.map((log, index) => (
          <Typography
            key={index}
            variant="body2"
            component="div"
            className={`debugEntry ${log.type === 'error' ? 'errorEntry' : ''}`}
            style={{
              color: log.type === 'error' ? theme.colors.accent.error : theme.colors.fg.primary,
              backgroundColor: log.type === 'error' ? `${theme.colors.accent.error}1A` : 'transparent',
              borderLeftColor: log.type === 'error' ? theme.colors.accent.error : 'transparent'
            }}
          >
            <code>[{new Date(log.timestamp).toISOString()}] {log.message}</code>
            {log.stack && (
              <Typography
                variant="caption"
                component="div"
                className="stackTrace"
                style={{
                  color: `${theme.colors.accent.error}CC`, // 80% opacity
                  borderLeftColor: `${theme.colors.accent.error}4D` // 30% opacity
                }}
              >
                <code>{log.stack}</code>
              </Typography>
            )}
          </Typography>
        ))}
      </div>
    </div>
  );
};

export default DebugConsole;