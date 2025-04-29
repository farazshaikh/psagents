# GameShow Component

A dynamic, interactive game show component that presents questions with timed responses, featuring an AI host (ZAIA) that guides users through an engaging question-and-answer experience.

## Concept

The GameShow component implements an interactive video-based quiz game where:
- An AI host (ZAIA) presents questions through video and text
- Questions appear with animated options
- Players have a limited time (20 seconds) to answer each question
- Visual feedback is provided through progress bars and animations
- The game maintains state and progresses through questions automatically

## Component Architecture

### Core Components

1. **GameShowPage**
   - Top-level component that initializes the game environment
   - Manages the overall layout and component composition
   - Entry point for the game show feature

2. **ChatPanel**
   - Handles all message interactions and displays
   - Manages question presentation and countdown timers
   - Implements the message animation system
   - Sub-components:
     - `MessageComponent`: Renders different types of messages (text, questions, system)
     - `TypingIndicator`: Shows when ZAIA is "typing"
     - `ParticipateButton`: Initiates game participation
     - `DebugConsole`: Provides real-time debugging information

### State Management

1. **GameContext**
   - Centralized state management using React Context
   - Manages:
     - Game state (playing, messages, current question)
     - Video state (time, playing status)
     - Question state (current question, options, countdown)
     - UI state (typing indicators, animations)

2. **Key Interfaces**
```typescript
interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: number;
}

interface Message {
  id: string;
  text: string;
  type: 'text' | 'question' | 'system';
  timestamp: number;
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
```

## Initialization Flow

1. **Component Mount**
   ```typescript
   // GameShowPage mounts
   ↓
   // GameProvider initializes with default state
   ↓
   // ChatPanel renders with initial empty state
   ↓
   // ParticipateButton appears
   ↓
   // User clicks to start
   ↓
   // Game state updates to playing
   ```

2. **Question Flow**
   ```typescript
   // Question received
   ↓
   // Options reveal sequentially (1s delay between each)
   ↓
   // Countdown starts (20s)
   ↓
   // User selects or time expires
   ↓
   // Next question cycle begins
   ```

## Component Interactions and React Integration

### Component Hierarchy and Data Flow

```
GameShowPage
├── GameProvider (Context)
│   └── ChatPanel
│       ├── ParticipateButton
│       ├── MessageComponent(s)
│       │   └── Options (when question type)
│       ├── TypingIndicator
│       └── DebugConsole
```

### React System Integration

1. **Context Integration**
   ```typescript
   // Provider setup in GameShowPage
   const GameShowPage = () => (
     <GameProvider>
       <ChatPanel />
     </GameProvider>
   );

   // Context consumption in child components
   const ChatPanel = () => {
     const { state, dispatch } = useGameContext();
     // Component logic
   };
   ```

2. **Effect Management**
   - **Mount Effects**: Handle initial setup and subscriptions
   ```typescript
   useEffect(() => {
     // Initialize game state
     // Set up event listeners
     return () => {
       // Cleanup subscriptions
     };
   }, []);
   ```
   - **Update Effects**: Manage state changes and animations
   ```typescript
   useEffect(() => {
     if (message.type === 'question') {
       // Handle question animations
       // Start countdown
     }
   }, [message.type]);
   ```

3. **State Management Patterns**
   - **Local State**: Component-specific UI states
   ```typescript
   const [visible, setVisible] = useState(false);
   const [revealedOptions, setRevealedOptions] = useState(0);
   ```
   - **Ref Usage**: Mutable values that don't trigger re-renders
   ```typescript
   const startTimeRef = useRef<number | null>(null);
   const animationFrameRef = useRef<number>();
   ```
   - **Context State**: Shared game state
   ```typescript
   const { state: { currentQuestion, isTyping }, dispatch } = useGameContext();
   ```

### Inter-Component Communication

1. **Parent-Child Communication**
   - Props flow down from parent to child components
   - Children communicate up through callback props
   ```typescript
   // Parent passing callbacks
   <MessageComponent
     message={message}
     onOptionSelect={handleOptionSelect}
     onAnimationComplete={handleAnimationComplete}
   />
   ```

2. **Context-Based Communication**
   - Components dispatch actions to update shared state
   - State changes trigger re-renders in subscribed components
   ```typescript
   // Dispatching actions
   dispatch({ type: 'ANSWER_SELECTED', payload: optionIndex });

   // Responding to state changes
   useEffect(() => {
     if (state.currentQuestion) {
       // Handle new question
     }
   }, [state.currentQuestion]);
   ```

3. **Event-Based Communication**
   - Custom events for cross-component messaging
   ```typescript
   // Emitting events
   const event = new CustomEvent('gameEvent', { detail: { type: 'questionComplete' } });
   window.dispatchEvent(event);

   // Listening for events
   useEffect(() => {
     const handler = (e: CustomEvent) => {
       // Handle game event
     };
     window.addEventListener('gameEvent', handler);
     return () => window.removeEventListener('gameEvent', handler);
   }, []);
   ```

### Performance Optimizations

1. **Memoization**
   ```typescript
   // Memoized callback
   const handleOptionClick = useCallback((optionIndex: number) => {
     // Handle option selection
   }, [dispatch]);

   // Memoized component
   const MemoizedMessageComponent = memo(MessageComponent);
   ```

2. **Render Optimization**
   - Using `key` prop for efficient list rendering
   - Implementing `shouldComponentUpdate` logic
   ```typescript
   <div id="captions">
     {messages.map((message) => (
       <MessageComponent
         key={message.id}
         message={message}
       />
     ))}
   </div>
   ```

3. **State Updates**
   - Batching state updates for better performance
   ```typescript
   const updateGameState = () => {
     dispatch({ type: 'UPDATE_SCORE', payload: newScore });
     dispatch({ type: 'NEXT_QUESTION' });
     // React will batch these updates
   };
   ```

### Animation and Timer Management

1. **Animation Coordination**
   - Using refs to track animation states
   - Coordinating multiple animations
   ```typescript
   const animationRefs = {
     options: useRef<Animation[]>([]),
     countdown: useRef<Animation>(),
   };
   ```

2. **Timer Synchronization**
   - Central timer management
   - Cleanup on component unmount
   ```typescript
   useEffect(() => {
     const timers: number[] = [];
     // Set up timers
     return () => timers.forEach(clearTimeout);
   }, []);
   ```

### Error Boundaries

```typescript
class GameErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to debug console
    // Reset game state if needed
  }

  render() {
    return this.props.children;
  }
}
```

## Component Interactions

### Message System
- Messages flow through the GameContext
- Each message type (`text`, `question`, `system`) has specific rendering rules
- Messages include:
  - AI host communications
  - Questions and options
  - System notifications
  - Video captions

### Countdown System
- Implemented using `requestAnimationFrame` for smooth animation
- Updates every frame for progress bar
- Updates every second for numerical display
- Cleans up properly on component unmount or early termination

### Debug System
- Real-time logging of game events
- Maintains last 100 messages
- Provides timestamp and event information
- Helps track game flow and state changes

## User Interaction Flow

1. **Game Start**
   - User sees welcome message
   - Clicks "Participate" button
   - Game initializes and video begins

2. **Question Presentation**
   - Question appears with animation
   - Options reveal sequentially
   - Countdown begins after all options shown

3. **User Response**
   - User can select an option
   - Countdown bar shows remaining time
   - Selection or timeout triggers next phase

4. **Feedback**
   - System provides immediate feedback
   - Next question cycle begins
   - Process repeats until game end

## Component Cleanup

The component implements several cleanup mechanisms:

1. **Animation Cleanup**
   ```typescript
   useEffect(() => {
     return () => {
       if (animationFrameRef.current !== undefined) {
         cancelAnimationFrame(animationFrameRef.current);
       }
     };
   }, []);
   ```

2. **Timeout Cleanup**
   ```typescript
   useEffect(() => {
     const timeouts: NodeJS.Timeout[] = [];
     // ... timeout logic ...
     return () => {
       timeouts.forEach(clearTimeout);
     };
   }, []);
   ```

3. **Context Cleanup**
   - GameContext maintains clean state transitions
   - Prevents memory leaks and state pollution
   - Handles component unmounting gracefully

## Styling

The component uses a sophisticated styling system:

1. **Base Styling**
   - Dark theme with semi-transparent elements
   - Blur effects for depth
   - Smooth animations and transitions

2. **Message Styling**
   - Different styles for each message type
   - Avatar system for AI host
   - Animated reveals and transitions

3. **Interactive Elements**
   - Progress bars with gradients
   - Animated buttons and options
   - Responsive layouts for all screen sizes

## Debug Console

The debug console provides real-time insight into the game's operation:

1. **Features**
   - Timestamps for all events
   - State change logging
   - Countdown updates
   - Message flow tracking

2. **Usage**
   - Visible during development
   - Scrollable message history
   - Filterable by event type

## Future Enhancements

Potential areas for improvement:

1. **Gameplay**
   - Score tracking system
   - Multiple question types
   - Difficulty progression

2. **Technical**
   - Performance optimizations
   - Additional animation options
   - Enhanced debug capabilities

3. **UI/UX**
   - More interactive elements
   - Additional visual feedback
   - Customizable themes

## Dependencies

- React 18+
- TypeScript
- Modern browser with requestAnimationFrame support

### React Hooks and Refs Best Practices

1. **Ref Cleanup in Effects**
   ```typescript
   // ❌ Incorrect: Using ref directly in cleanup
   useEffect(() => {
     return () => {
       loadedStylesRef.current.forEach(cleanup);
     };
   }, []);

   // ✅ Correct: Capturing ref value in effect scope
   useEffect(() => {
     const styles = loadedStylesRef.current;
     return () => {
       styles.forEach(cleanup);
     };
   }, []);
   ```

2. **Resource Management**
   ```typescript
   // Proper style and script cleanup
   useEffect(() => {
     const styles = loadedStylesRef.current;
     const scripts = loadedScriptsRef.current;

     return () => {
       styles.forEach(style => style.remove());
       scripts.forEach(script => script.remove());
     };
   }, []);
   ```

3. **Ref Stability**
   ```typescript
   // Stable ref initialization
   const loadedStylesRef = useRef<HTMLLinkElement[]>([]);
   const loadedScriptsRef = useRef<HTMLScriptElement[]>([]);

   // Updating refs safely
   const appendStyle = useCallback((style: HTMLLinkElement) => {
     loadedStylesRef.current = [...loadedStylesRef.current, style];
   }, []);
   ```

4. **Effect Dependencies**
   - Always include all dependencies used within effects
   - Use `useCallback` for function dependencies
   - Capture ref values at the start of effects
   ```typescript
   const handleResourceLoad = useCallback(() => {
     // Resource loading logic
   }, [/* dependencies */]);

   useEffect(() => {
     const currentResources = resourceRef.current;
     handleResourceLoad();
     return () => cleanup(currentResources);
   }, [handleResourceLoad]);
   ```

### Common Pitfalls and Solutions

1. **Stale Ref Values**
   ```typescript
   // Problem: Stale ref in cleanup
   useEffect(() => {
     return () => ref.current?.cleanup();
   }, []);

   // Solution: Capture value
   useEffect(() => {
     const element = ref.current;
     return () => element?.cleanup();
   }, []);
   ```

2. **Resource Leaks**
   ```typescript
   // Ensure all resources are tracked and cleaned up
   useEffect(() => {
     const resources = new Set();

     const track = (resource: any) => {
       resources.add(resource);
     };

     return () => {
       resources.forEach(resource => resource.cleanup());
       resources.clear();
     };
   }, []);
   ```

3. **Memory Management**
   ```typescript
   // Clear refs on unmount
   useEffect(() => {
     return () => {
       loadedStylesRef.current = [];
       loadedScriptsRef.current = [];
     };
   }, []);
   ```