import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import type { Message } from '../context/GameContext';
import { debugLog, debugError } from '../../../../utils/debug';

interface MessageProps {
  message: Message;
  isLast: boolean;
  totalMessages: number;
  messageIndex: number;
}

const COUNTDOWN_DURATION = 20000; // 20 seconds in milliseconds
const OPTION_REVEAL_DELAY = 1000; // 1 second between each option reveal

const calculateOpacity = (index: number, total: number): number => {
  // Get CSS variables for configuration
  const root = document.documentElement;
  const fadeRate = parseFloat(getComputedStyle(root).getPropertyValue('--message-fade-rate')) || 0.25;
  const minOpacity = parseFloat(getComputedStyle(root).getPropertyValue('--message-min-opacity')) || 0.15;
  const maxOpacity = parseFloat(getComputedStyle(root).getPropertyValue('--message-opacity-latest')) || 1;

  // Calculate relative position from newest (0) to oldest (1)
  const position = index / (total - 1);
  
  // Exponential decay formula: opacity = max * e^(-fadeRate * position)
  const opacity = maxOpacity * Math.exp(-fadeRate * position * 10);
  
  // Ensure opacity doesn't go below minimum
  return Math.max(opacity, minOpacity);
};

const MessageComponent: React.FC<MessageProps> = ({ message, isLast, totalMessages, messageIndex }) => {
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
    try {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        debugLog('Countdown started');

        const updateCountdown = () => {
          try {
            if (startTimeRef.current === null) return;

            const elapsedTime = Date.now() - startTimeRef.current;
            const remainingTime = Math.max(0, COUNTDOWN_DURATION - elapsedTime);
            const newSecondsLeft = Math.ceil(remainingTime / 1000);
            const newProgress = (remainingTime / COUNTDOWN_DURATION) * 100;

            setProgress(newProgress);

            if (newSecondsLeft !== lastSecondRef.current) {
              lastSecondRef.current = newSecondsLeft;
              setSecondsLeft(newSecondsLeft);

              // Throttle debug logging to log only once per second
              if (newSecondsLeft % 1 === 0) {
                debugLog(`Countdown: ${newSecondsLeft}s remaining`);
              }
            }

            if (remainingTime > 0) {
              animationFrameRef.current = requestAnimationFrame(updateCountdown);
            } else {
              debugLog('Countdown finished, dispatching timeout');
              dispatch({ type: 'QUESTION_TIMEOUT' });
            }
          } catch (error) {
            debugError(error as Error, 'Error in countdown update');
          }
        };

        updateCountdown();
      }
    } catch (error) {
      debugError(error as Error, 'Error starting countdown');
    }
  }, [dispatch]);

  useEffect(() => {
    if (message.type === 'question' && currentQuestion) {
      debugLog('Question received, starting option reveal sequence');
      const timeouts: NodeJS.Timeout[] = [];

      const revealOptions = () => {
        if (revealedOptions < currentQuestion.options.length) {
          setRevealedOptions(prev => {
            const newValue = prev + 1;
            debugLog(`Revealing option ${newValue} of ${currentQuestion.options.length}`);
            return newValue;
          });
          timeouts.push(setTimeout(revealOptions, OPTION_REVEAL_DELAY));
        } else {
          debugLog('All options revealed, starting countdown');
          startCountdown();
        }
      };

      revealOptions();
      optionsTimeoutRef.current = timeouts;

      return () => {
        timeouts.forEach(clearTimeout);
        debugLog('Cleaned up option reveal timeouts');
      };
    }
  }, [message.type, currentQuestion, revealedOptions, startCountdown]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
        debugLog('Cleaned up animation frame');
      }
    };
  }, []);

  const handleOptionClick = (optionIndex: number) => {
    if (startTimeRef.current !== null) {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
        debugLog(`Option ${optionIndex} selected, countdown stopped`);
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
                      <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                      {option}
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

  const getMessageClasses = () => {
    return `message ${visible ? 'visible' : ''} ${message.type}`;
  };

  const messageStyle = {
    opacity: isLast ? 1 : calculateOpacity(messageIndex, totalMessages)
  };

  return (
    <div className={getMessageClasses()} style={messageStyle}>
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
    <div className="message visible">
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

export const ChatPanel: React.FC = () => {
  const { state } = useGameContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      // Force immediate scroll to bottom
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      
      // Double-check scroll position after a brief delay to handle dynamic content
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  // Scroll when options are revealed for questions
  useEffect(() => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?.type === 'question') {
      const scrollInterval = setInterval(scrollToBottom, 100);
      // Keep checking for 2 seconds to ensure all content is revealed
      setTimeout(() => clearInterval(scrollInterval), 2000);
      return () => clearInterval(scrollInterval);
    }
  }, [state.messages, scrollToBottom]);

  return (
    <div className="chat-panel">
      <div className="messages-container" ref={messagesContainerRef}>
        {state.messages.map((message, index) => (
          <MessageComponent
            key={message.id}
            message={message}
            isLast={index === state.messages.length - 1}
            totalMessages={state.messages.length}
            messageIndex={state.messages.length - 1 - index}
          />
        ))}
        {state.isTyping && <TypingIndicator />}
        {!state.isPlaying && <ParticipateButton />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatPanel;