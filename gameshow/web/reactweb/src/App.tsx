import React, { lazy, Suspense } from 'react';
import { Landing } from './components/features/Landing';
import { useFeatureFlags } from './utils/featureFlags';
import './App.css';

// Only import DebugConsole in development
const DebugConsole = process.env.NODE_ENV === 'development' 
  ? lazy(() => import('./components/basic/DebugConsole'))
  : () => null;

function App() {
  const { debugConsole } = useFeatureFlags();
  
  return (
    <div className="app">
      <Landing />
      {debugConsole && (
        <Suspense fallback={null}>
          <DebugConsole initialVisible={false} />
        </Suspense>
      )}
    </div>
  );
}

export default App;
