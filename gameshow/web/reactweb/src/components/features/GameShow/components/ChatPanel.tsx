import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import type { Message } from '../context/GameContext';

interface MessageProps {
  message: Message;
  isLast: boolean;
}

const COUNTDOWN_DURATION = 20000; // 20 seconds in milliseconds
const OPTION_REVEAL_DELAY = 1000; // 1 second between each option reveal

// Debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Debug logging function
const logToDebug = debounce((message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[LOG] [${timestamp}] ${message}`;
  
  // Log to browser console
  console.log(logMessage);
  
  // Find debug console element
  const debugConsole = document.querySelector('.debug-messages');
  if (debugConsole) {
    const logEntry = document.createElement('div');
    logEntry.className = 'debug-message';
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    debugConsole.appendChild(logEntry);
    
    // Keep only last 100 messages
    const messages = debugConsole.children;
    while (messages.length > 100) {
      debugConsole.removeChild(messages[0]);
    }
    
    // Scroll to bottom
    debugConsole.scrollTop = debugConsole.scrollHeight;
  }
}, 100);

const MessageComponent: React.FC<MessageProps> = ({ message, isLast }) => {
  const { state, dispatch } = useGameContext();
  const { currentQuestion } = state;
  const [visible, setVisible] = useState(false);
  const [revealedOptions, setRevealedOptions] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const optionsTimeoutRef = useRef<NodeJS.Timeout[]>([]);
  const lastSecondRef = useRef<number>(20);

  useEffect(() => {
    setVisible(true);
  }, []);

  const startCountdown = useCallback(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      logToDebug('Countdown started');
      
      const updateCountdown = () => {
        if (startTimeRef.current === null) return;
        
        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = Math.max(0, COUNTDOWN_DURATION - elapsedTime);
        const newSecondsLeft = Math.ceil(remainingTime / 1000);
        const newProgress = (remainingTime / COUNTDOWN_DURATION) * 100;
        
        setProgress(newProgress);
        
        // Only update seconds display when it changes
        if (newSecondsLeft !== lastSecondRef.current) {
          lastSecondRef.current = newSecondsLeft;
          setSecondsLeft(newSecondsLeft);
          logToDebug(`Countdown: ${newSecondsLeft}s remaining`);
        }
        
        if (remainingTime > 0) {
          animationFrameRef.current = requestAnimationFrame(updateCountdown);
        } else {
          logToDebug('Countdown finished, dispatching timeout');
          dispatch({ type: 'QUESTION_TIMEOUT' });
        }
      };
      
      updateCountdown();
    }
  }, [dispatch]);

  useEffect(() => {
    if (message.type === 'question' && currentQuestion) {
      logToDebug('Question received, starting option reveal sequence');
      const timeouts: NodeJS.Timeout[] = [];
      
      const revealOptions = () => {
        if (revealedOptions < currentQuestion.options.length) {
          setRevealedOptions(prev => {
            const newValue = prev + 1;
            logToDebug(`Revealing option ${newValue} of ${currentQuestion.options.length}`);
            return newValue;
          });
          timeouts.push(setTimeout(revealOptions, OPTION_REVEAL_DELAY));
        } else {
          logToDebug('All options revealed, starting countdown');
          startCountdown();
        }
      };

      revealOptions();
      optionsTimeoutRef.current = timeouts;

      return () => {
        timeouts.forEach(clearTimeout);
        logToDebug('Cleaned up option reveal timeouts');
      };
    }
  }, [message.type, currentQuestion, revealedOptions, startCountdown]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
        logToDebug('Cleaned up animation frame');
      }
    };
  }, []);

  const handleOptionClick = (optionIndex: number) => {
    if (startTimeRef.current !== null) {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
        logToDebug(`Option ${optionIndex} selected, countdown stopped`);
      }
      dispatch({ type: 'ANSWER_SELECTED', payload: optionIndex });
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'question':
        return (
          <>
            <div className="question-text">{message.text}</div>
            {currentQuestion && (
              <div className="options-container">
                {currentQuestion.options.map((option, index) => (
                  index < revealedOptions && (
                    <button
                      key={index}
                      className="option-button"
                      onClick={() => handleOptionClick(index)}
                      disabled={secondsLeft === 0}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </button>
                  )
                ))}
                {revealedOptions === currentQuestion.options.length && (
                  <div className="countdown-container">
                    <div 
                      className="countdown-progress" 
                      style={{ width: `${progress}%` }} 
                    />
                    <div className="countdown-display">
                      {secondsLeft}s
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      case 'text':
      case 'system':
        return (
          <div className="message-text">
            {message.text}
          </div>
        );
    }
  };

  return (
    <div className={`message ${visible ? 'visible' : ''} ${message.type}`}>
      {(message.type === 'text' || message.type === 'system') && (
        <div className="avatar-bubble">
          <span className="avatar-letter">Z</span>
        </div>
      )}
      <div className="message-content">
        {renderMessageContent()}
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="typing-indicator active">
    <div className="avatar-bubble">
      <span className="avatar-letter">Z</span>
    </div>
    <div className="dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
);

const ParticipateButton: React.FC = () => {
  const { dispatch } = useGameContext();
  const [clicked, setClicked] = useState(false);

  const handleStart = () => {
    if (clicked) return;
    setClicked(true);
    dispatch({ type: 'START_GAME' });
  };

  return (
    <div className="caption-entry show clickable">
      <div className="avatar-bubble">
        <span className="avatar-letter">Z</span>
      </div>
      <div className="message-content">
        <button 
          className={`participate-button ${clicked ? 'clicked' : ''}`} 
          onClick={handleStart}
          disabled={clicked}
        >
          <span className="green-dot"></span>
          {clicked ? 'Starting...' : 'Participate'}
        </button>
      </div>
    </div>
  );
};

// Debug Console Component
const DebugConsole: React.FC = () => {
  return (
    <div className="debug-console">
      <div className="debug-header">
        <span>Debug Console</span>
        <div className="debug-controls">
          <button onClick={() => document.querySelector('.debug-messages')?.scrollTo(0, 0)}>
            Top
          </button>
          <button onClick={() => document.querySelector('.debug-messages')?.scrollTo(0, Number.MAX_SAFE_INTEGER)}>
            Bottom
          </button>
        </div>
      </div>
      <div className="debug-messages"></div>
    </div>
  );
};

export const ChatPanel: React.FC = () => {
  const { state } = useGameContext();
  const { isPlaying, messages, isTyping } = state;
  const chatRef = useRef<HTMLDivElement>(null);

  // Handle message display and auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <>
      <div className="chat-panel">
        <div id="captions" ref={chatRef}>
          {!isPlaying && <ParticipateButton />}
          {messages.map((message, index) => (
            <MessageComponent 
              key={message.id} 
              message={message} 
              isLast={index === messages.length - 1}
            />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      </div>
      <DebugConsole />
    </>
  );
};

export default ChatPanel; 