# Debug Console Component

A collapsible debug console component that displays logs and performance metrics in real-time.

## Features

- Collapsible interface
- Real-time log display
- Unread message counter
- Copy logs to clipboard
- Performance metrics tracking
- Customizable visibility
- Timestamp for each log entry

## Installation

The component is part of the gameshow web application. No additional installation is required.

## Usage

### Basic Usage

```tsx
import DebugConsole from '../components/basic/DebugConsole';

function App() {
  return <DebugConsole />;
}
```

### With Initial Visibility

```tsx
import DebugConsole from '../components/basic/DebugConsole';

function App() {
  return <DebugConsole initialVisible={false} />;
}
```

### Global Debug Function

The component adds a global `debug` function that can be used anywhere in your application:

```typescript
// Log a message
window.debug('Hello from anywhere!');

// Log an error
window.debug('Error occurred', 'error');

// Log an object
window.debug({
  message: 'Complex data',
  details: { foo: 'bar' }
});
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| initialVisible | boolean | false | Initial visibility state of the console |

## Environment Variables

The debug console visibility can be controlled through environment variables:

1. Using `REACT_APP_DEBUG_CONSOLE`:
   ```bash
   REACT_APP_DEBUG_CONSOLE=true npm start
   ```

2. Using the feature flags utility:
   ```typescript
   // In your featureFlags.ts
   export const useFeatureFlags = () => ({
     debugConsole: process.env.REACT_APP_DEBUG_CONSOLE === 'true'
   });
   ```

## Features Details

### Log Entry Types

- Regular logs (default)
- Error logs (displayed in red)
- Object logs (automatically stringified)

### Unread Counter

- Appears when console is collapsed
- Shows count of new messages
- Resets when console is expanded
- Counts both regular logs and errors

### Performance Metrics

The console automatically tracks and displays:
- Timestamp for each log entry
- Memory usage (if available)
- Frame rate (if enabled)

### Controls

- Toggle visibility button
- Copy logs button (copies all logs to clipboard)
- Clear logs button (clears the console)

## Styling

The console can be styled using CSS modules. Key style classes:

- `.debugWrapper`: Main container
- `.debugHandle`: Visibility toggle bar
- `.debugConsole`: Log display area
- `.unreadBadge`: Unread message counter
- `.copyLogs`: Copy button

## Best Practices

1. Keep the console collapsed by default in production
2. Use descriptive log messages
3. Clear logs periodically to maintain performance
4. Use error type for important warnings
5. Consider log levels for different environments 