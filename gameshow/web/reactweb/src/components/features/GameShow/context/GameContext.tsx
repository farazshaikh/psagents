import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: number;
}

export interface Message {
  id: string;
  text: string;
  type: 'text' | 'question' | 'system';
  timestamp: number;
}

interface VideoState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
}

interface GameState {
  isPlaying: boolean;
  videoState: VideoState;
  messages: Message[];
  currentQuestion: Question | null;
  currentCaption: string | null;
  isTyping: boolean;
  hasShownFinalQuestion: boolean;
  countdown: number;
}

type GameAction =
  | { type: 'START_GAME' }
  | { type: 'SET_VIDEO_STATE'; payload: Partial<VideoState> }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_CURRENT_QUESTION'; payload: Question | null }
  | { type: 'SET_CURRENT_CAPTION'; payload: string | null }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_FINAL_QUESTION_SHOWN'; payload: boolean }
  | { type: 'QUESTION_TIMEOUT' }
  | { type: 'ANSWER_SELECTED'; payload: number }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'DECREMENT_COUNTDOWN' };

const initialState: GameState = {
  isPlaying: false,
  videoState: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isMuted: false,
    isFullscreen: false,
  },
  messages: [],
  currentQuestion: null,
  currentCaption: null,
  isTyping: false,
  hasShownFinalQuestion: false,
  countdown: 20,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        isPlaying: true,
        messages: [],
        isTyping: false,
        currentCaption: null,
        currentQuestion: null,
        hasShownFinalQuestion: false,
        countdown: 20,
        videoState: {
          ...state.videoState,
          currentTime: 0,
          isPlaying: true,
          isMuted: false
        }
      };

    case 'SET_VIDEO_STATE':
      return {
        ...state,
        videoState: {
          ...state.videoState,
          ...action.payload,
        },
      };

    case 'ADD_MESSAGE':
      // Don't add duplicate messages
      if (state.messages.some(msg => msg.text === action.payload.text)) {
        return state;
      }
      return {
        ...state,
        messages: [...state.messages, action.payload],
        isTyping: false
      };

    case 'SET_CURRENT_QUESTION':
      if (action.payload) {
        return {
          ...state,
          currentQuestion: action.payload,
          messages: [...state.messages, {
            id: `question-${action.payload.id}`,
            text: action.payload.text,
            type: 'question',
            timestamp: Date.now()
          }]
        };
      }
      return {
        ...state,
        currentQuestion: null
      };

    case 'SET_CURRENT_CAPTION':
      if (action.payload === null) {
        return {
          ...state,
          currentCaption: null
        };
      }
      return {
        ...state,
        currentCaption: action.payload,
        messages: [
          ...state.messages,
          {
            id: `caption-${Date.now()}`,
            text: action.payload,
            type: 'text',
            timestamp: Date.now()
          }
        ]
      };

    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload,
      };

    case 'SET_FINAL_QUESTION_SHOWN':
      return {
        ...state,
        hasShownFinalQuestion: action.payload,
      };

    case 'QUESTION_TIMEOUT':
      // Check if we already have a timeout message for this question
      if (state.messages.some(msg => 
        msg.type === 'text' && 
        msg.text === "Time's up! Let's move on to the next question."
      )) {
        return state;
      }
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: Date.now().toString(),
            type: 'text',
            text: "Time's up! Let's move on to the next question.",
            timestamp: Date.now()
          }
        ]
      };

    case 'ANSWER_SELECTED':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: Date.now().toString(),
            type: 'text',
            text: `You selected option ${String.fromCharCode(65 + action.payload)}. Let's see if that's correct!`,
            timestamp: Date.now()
          }
        ]
      };

    case 'SET_COUNTDOWN':
      return {
        ...state,
        countdown: action.payload
      };

    case 'DECREMENT_COUNTDOWN':
      return {
        ...state,
        countdown: Math.max(0, state.countdown - 1)
      };

    default:
      return state;
  }
};

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}; 