import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Landing } from './components/features/Landing';
import { useFeatureFlags } from './utils/featureFlags';
import './App.css';
import { ThemeProvider } from './components/basic/ThemeProvider';

// Only import DebugConsole in development
const DebugConsole = process.env.NODE_ENV === 'development'
  ? lazy(() => import('./components/basic/DebugConsole'))
  : () => null;

function App() {
  const { debugConsole } = useFeatureFlags();
  const performanceMetricsRef = useRef<string[]>([]);
  const hasLoggedMetrics = useRef(false);

  // Get initial theme from localStorage or default to light
  const initialTheme = localStorage.getItem('theme') || 'light';

  // Collect performance metrics early
  useEffect(() => {
    if (!debugConsole) return;

    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const firstPaint = paint.find(entry => entry.name === 'first-paint');
      const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint');

      const metrics = [
        'Performance Metrics:',
        `DNS lookup: ${Math.round(navigation.domainLookupEnd - navigation.domainLookupStart)}ms`,
        `Connection time: ${Math.round(navigation.connectEnd - navigation.connectStart)}ms`,
        `Response time: ${Math.round(navigation.responseEnd - navigation.requestStart)}ms`,
        `DOM Interactive: ${Math.round(navigation.domInteractive - navigation.startTime)}ms`,
        `DOM Complete: ${Math.round(navigation.domComplete - navigation.startTime)}ms`,
        `Load Event: ${Math.round(navigation.loadEventEnd - navigation.startTime)}ms`,
        `First Paint: ${Math.round(firstPaint?.startTime || 0)}ms`,
        `First Contentful Paint: ${Math.round(firstContentfulPaint?.startTime || 0)}ms`
      ];

      performanceMetricsRef.current = metrics;
    };

    // Collect metrics after a short delay to ensure all timings are available
    setTimeout(collectMetrics, 0);
  }, [debugConsole]);

  // Log metrics when debug function becomes available
  useEffect(() => {
    const logMetricsInterval = setInterval(() => {
      const debug = window.debug;
      if (typeof debug === 'function' && performanceMetricsRef.current.length > 0 && !hasLoggedMetrics.current) {
        performanceMetricsRef.current.forEach(metric => debug(metric));
        hasLoggedMetrics.current = true;

        // Set up performance observer for long tasks
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            debug(`Long Task detected: ${Math.round(entry.duration)}ms`);
          });
        });

        observer.observe({ entryTypes: ['longtask'] });
        clearInterval(logMetricsInterval);
        return () => observer.disconnect();
      }
    }, 100); // Check every 100ms

    return () => clearInterval(logMetricsInterval);
  }, []);

  return (
    <ThemeProvider themeName={initialTheme as 'light' | 'dark'}>
    <div className="app">
        <Landing />
      {debugConsole && (
        <Suspense fallback={null}>
          <DebugConsole initialVisible={false} />
        </Suspense>
      )}
    </div>
    </ThemeProvider>
  );
}

export default App;
