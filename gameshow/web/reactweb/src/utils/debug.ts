export const debugLog = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    // Use global debug function if available, fallback to console.log
    if (typeof window !== 'undefined' && window.debug) {
      window.debug(message);
    } else {
      console.log(`[GameShow Debug] ${new Date().toLocaleTimeString()} - ${message}`);
    }
  }
};

export const debugError = (error: Error | string, errorInfo?: string) => {
  if (process.env.NODE_ENV === 'development') {
    // Use global debugError function if available, fallback to console.error
    if (typeof window !== 'undefined' && window.debugError) {
      window.debugError(error, errorInfo);
    } else {
      console.error(`[GameShow Error] ${new Date().toLocaleTimeString()} - ${error}`);
      if (errorInfo) {
        console.error(errorInfo);
      }
    }
  }
};

// Expose debug function globally for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).showDebug = debugLog;
}