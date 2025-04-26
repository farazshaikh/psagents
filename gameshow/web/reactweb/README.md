# TrueM Web Platform

PROPRIETARY AND CONFIDENTIAL SOFTWARE
Copyright © 2024 TrueM. All rights reserved.

This software is proprietary and confidential. The source code is not to be copied, distributed, or used without explicit written permission from TrueM. See the LICENSE file in the project root for the complete terms and conditions.

A minimalist React-based web platform featuring a landing page and interactive game show experience.

## Project Overview

This project implements a company landing page with routing to various products, with the primary focus on TrueShow - an AI-hosted interactive game show. The platform is designed to be simple, modular, and easily maintainable.

### Key Features

- Dynamic landing page with product showcase
- TrueShow game show experience
  - Instagram-style live interface
  - Synchronized video and chat messages
  - Interactive quiz format
- User authentication (planned)
- Modular component architecture
- Theme-swappable UI (Instagram/TikTok styles)

## Architecture

### Component Structure
```
src/
├── components/
│   ├── basic/           # Core reusable components
│   │   ├── Button/
│   │   ├── Typography/
│   │   └── VideoPlayer/
│   ├── composite/       # Combined components
│   │   ├── Navigation/
│   │   ├── ChatOverlay/
│   │   └── ProductCard/
│   └── features/        # Major feature components
│       ├── Landing/
│       └── GameShow/
├── styles/             # Global styles and themes
├── data/              # AppData and constants
└── utils/             # Helper functions
```

### AppData Structure
- Centralized data management
- Default configuration in `data/default.ts`
- Remote configuration fetching from `https://domainname/restendpoint`
- No hardcoded values

## Development Roadmap

### Phase 1: Project Setup
- [ ] Initialize React project with TypeScript
- [ ] Set up routing structure
- [ ] Implement AppData management
- [ ] Create basic component structure
- [ ] Set up development server

### Phase 2: Landing Page
- [ ] Implement splash banner component
- [ ] Create navigation structure
- [ ] Build product showcase section
- [ ] Implement basic routing

### Phase 3: TrueShow Integration
- [ ] Port video player from existing implementation
- [ ] Implement chat overlay system
- [ ] Integrate caption synchronization
- [ ] Build quiz interface
- [ ] Connect game logic

### Phase 4: Authentication
- [ ] Set up authentication framework
- [ ] Implement Google login
- [ ] Implement Facebook login
- [ ] Add email authentication
- [ ] Add phone authentication

### Phase 5: Styling System
- [ ] Create base theme
- [ ] Implement Instagram-style theme
- [ ] Implement TikTok-style theme
- [ ] Add theme switching capability

## Technical Details

### Core Dependencies
- React
- TypeScript
- React Router
- Basic CSS (no heavy frameworks)

### Component Guidelines
1. Each component must be self-contained
   - Own styles
   - Own state management
   - Own types
   - Own tests

2. Component Structure Example:
```
ComponentName/
├── index.tsx          # Component code
├── styles.css         # Component styles
├── types.ts           # TypeScript definitions
└── test.tsx          # Component tests
```

### Server Implementation
- Initial: Python-based HTTP server
- Future: Migration to edge computing (Cloudflare Workers)
- Focus on low latency for live game show experience

## Development Guidelines

1. **Simplicity First**
   - Avoid unnecessary dependencies
   - Use vanilla CSS where possible
   - Keep components focused and minimal

2. **Self-Contained Components**
   - Each component should be independently testable
   - Styles should be component-scoped
   - State should be properly encapsulated

3. **React Function Components**
   - Use function components over class components
   - Benefits:
     - Better TypeScript integration and type inference
     - Hooks support for state and side effects
     - Simpler testing with pure functions
     - Easier logic reuse through custom hooks
     - Reduced boilerplate and cleaner syntax
     - Better performance (no instance creation, smaller bundle)
   - Exception: Only use class components when dealing with Error Boundaries (React limitation)

4. **Theme-Driven Component Design**
   - Use React Context for centralized theme management
   - Basic components must be unopinionated and derive styles from theme
   - Theme structure:
     - Typography: fonts, sizes, weights
     - Colors: primary, secondary, error, text, background
     - Spacing: consistent spacing scale
     - Component-specific tokens (buttons, inputs, etc.)
   - Benefits:
     - Consistent styling across the application
     - Easy theme switching
     - Type-safe theme values
     - Single source of truth for design tokens
   - Example:
     ```typescript
     // Good - Theme-driven button
     const Button = () => {
       const { theme } = useTheme();
       return <button style={{ 
         backgroundColor: theme.buttons.variants.contained.background,
         padding: theme.spacing.md
       }}/>;
     };

     // Bad - Hardcoded values
     const Button = () => {
       return <button style={{ 
         backgroundColor: '#0095F6',
         padding: '16px'
       }}/>;
     };
     ```

5. **Configuration**
   - No hardcoded values
   - All constants in AppData
   - Environment-based configuration

6. **Testing**
   - Component-level tests
   - Integration tests for features
   - End-to-end tests for critical flows

7. **Feature Flags**
   - Development features can be enabled via settings.json, each entry which is true is converted to REACT_APP_<entry_name>
   - Available flags:
     - `REACT_APP_DEBUGCONSOLE`: Enables the debug console (pull-up panel at bottom of screen)
     - `REACT_APP_WAVECONTROLLER`: Enables wave animation controls

   Usage methods:
   1. Using npm scripts:
      ```bash
      # Enable single feature
      npm run start:flags

   Note: Environment variables take precedence over component props for feature flags.

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Git

### Installation
1. Clone the repository:
   ```bash
   git clone [github tmt agentstm]
   cd gameshow/web/reactweb
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm start
   ```
   This will run the app in development mode at [http://localhost:3000](http://localhost:3000)

2. For production build:
   ```bash
   npm run build
   ```
   This creates an optimized build in the `build` folder

### Testing

1. Run unit tests:
   ```bash
   npm test
   ```
   This launches the test runner in interactive watch mode

2. Run end-to-end tests (when implemented):
   ```bash
   npm run test:e2e
   ```

3. Check test coverage:
   ```bash
   npm test -- --coverage
   ```

### Code Quality

1. Lint the code:
   ```bash
   npm run lint
   ```

2. Format the code:
   ```bash
   npm run format
   ```

### Development Workflow

1. Make sure all tests pass before making changes:
   ```bash
   npm test
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Make your changes and verify them in the browser

4. Run linting and tests before committing:
   ```bash
   npm run lint
   npm test
   ```

### Troubleshooting

Common issues and solutions:

1. Port 3000 already in use:
   ```bash
   lsof -i :3000
   kill -9 [PID]
   ```

2. Clear npm cache if facing dependency issues:
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

## Development Server

The project includes a simple Python-based development server:
- Located in `server/`
- Handles basic HTTP requests
- Serves static assets
- Future migration path to edge computing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the guidelines
4. Submit a pull request

## License

[License Type] - See LICENSE file in the top level folder or the repositorfor details

## Theming and Styling Architecture

The project follows a clear separation of styling concerns to maintain consistency, reusability, and component independence:

### 1. Global Theme Provider

- **Purpose**: Manages all color-related styling and design tokens
- **Implementation**: Uses React Context to provide theme variables
- **Responsibilities**:
  - Color schemes and palettes
  - Gradient definitions
  - Text colors and opacity levels
  - Border colors
  - Shadow effects
  - Global design tokens
- **Usage**:
  ```typescript
  const Button = () => {
    // Colors and effects from theme
    return <button style={{ 
      background: 'var(--effects-gradient-primary)',
      color: 'var(--color-text-primary)'
    }}/>;
  };
  ```

### 2. Component-Level Styling

- **Purpose**: Controls component-specific visual behaviors
- **Scope**: Limited to the component's own styles.css file
- **Responsibilities**:
  - Animations and transitions
  - Shape transformations
  - Interactive behaviors
  - Component-specific layout
  - State-based styling (hover, active, etc.)
- **Example**:
  ```css
  .tagline-evolved {
    /* Animation controlled by component */
    opacity: 0;
    animation: evolveUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    transform-origin: bottom center;
    
    /* Colors from theme */
    background: var(--effects-gradient-evolved);
  }
  ```

### 3. Parent-Level Layout

- **Purpose**: Controls component positioning and layout relationships
- **Scope**: Defined in parent component styles
- **Responsibilities**:
  - Component positioning
  - Spacing between components
  - Grid/Flex layouts
  - Responsive layout adjustments
  - Container dimensions
- **Example**:
  ```css
  .landing-content {
    /* Layout controlled by parent */
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
    padding: var(--spacing-xl);
  }
  ```

### Benefits of This Architecture

1. **Maintainability**:
   - Clear separation of concerns
   - Easy theme switching
   - Simplified debugging
   - Centralized color management

2. **Reusability**:
   - Components are self-contained
   - Consistent theming across app
   - Portable animations
   - Flexible layouts

3. **Performance**:
   - Optimized style recalculations
   - Reduced CSS specificity conflicts
   - Better rendering performance

4. **Development Workflow**:
   - Clear ownership of styles
   - Easier collaboration
   - Simplified refactoring
   - Better code organization

### Best Practices

1. **Theme Usage**:
   - Always use theme variables for colors
   - Never hardcode color values
   - Use semantic color names
   - Maintain dark/light theme parity

2. **Component Styles**:
   - Keep animations with components
   - Use BEM naming convention
   - Avoid global styles
   - Document complex animations

3. **Layout Patterns**:
   - Use CSS Grid/Flexbox
   - Implement mobile-first
   - Use theme spacing units
   - Keep layouts flexible
