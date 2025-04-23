# [CompanyName] Web Platform

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

3. **Configuration**
   - No hardcoded values
   - All constants in AppData
   - Environment-based configuration

4. **Testing**
   - Component-level tests
   - Integration tests for features
   - End-to-end tests for critical flows

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm start
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

[License Type] - See LICENSE file for details
