import React from 'react';
import { Landing } from './components/features/Landing';
import { DebugConsole } from './components/basic/DebugConsole';
import { useFeatureFlags } from './utils/featureFlags';
import './App.css';

function App() {
  const { debugConsole } = useFeatureFlags();
  
  return (
    <div className="app">
      <Landing />
      {debugConsole && <DebugConsole initialVisible={true} />}
    </div>
  );
}

export default App;
