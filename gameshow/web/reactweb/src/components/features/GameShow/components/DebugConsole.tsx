import React, { useEffect, useRef, useState } from 'react';
import { useGameContext } from '../context/GameContext';

interface DebugMessage {
  timestamp: string;
  text: string;
}

export const DebugConsole: React.FC = () => {
  const { state } = useGameContext();
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Add debug message
  const addDebugMessage = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { timestamp, text }]);
  };

  // Expose debug function globally
  useEffect(() => {
    (window as any).showDebug = (message: string) => {
      addDebugMessage(message);
    };

    return () => {
      delete (window as any).showDebug;
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  // Log state changes
  useEffect(() => {
    addDebugMessage(
      `Game state updated:\n` +
      `    - Playing: ${state.isPlaying}\n` +
      `    - Video time: ${state.videoState.currentTime.toFixed(3)}\n` +
      `    - Messages: ${state.messages.length}\n` +
      `    - Current caption: ${state.currentCaption || 'none'}\n` +
      `    - Has final question: ${state.hasShownFinalQuestion}`
    );
  }, [state]);

  return (
    <div id="debug-console">
      <div className="debug-header">
        <span>Debug Console</span>
        <div className="debug-controls">
          <button onClick={() => setMessages([])}>Clear</button>
          <button onClick={() => console.log(state)}>Log State</button>
        </div>
      </div>
      <div className="debug-messages" ref={consoleRef}>
        {messages.map((msg, index) => (
          <div key={index} className="debug-message">
            <span className="timestamp">{msg.timestamp}</span>
            <span className="message">{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugConsole; 