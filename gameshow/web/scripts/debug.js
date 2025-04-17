// Debug Logger Class
class DebugLogger {
  constructor() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeDebugConsole());
    } else {
      this.initializeDebugConsole();
    }
  }

  initializeDebugConsole() {
    // Check if debug console already exists
    const existingConsole = document.getElementById('debugConsole');
    if (existingConsole) {
      // Use existing console
      this.wrapper = existingConsole.parentElement;
      this.console = existingConsole;
      this.toggleButton = document.getElementById('debugToggle');
      this.log('Debug logger connected to existing console');
      return;
    }

    // Create new console if none exists
    this.createDebugConsole();
  }

  createDebugConsole() {
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.id = 'debugWrapper';

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'debug-buttons';

    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.id = 'debugCopy';
    copyButton.textContent = 'Copy Logs';
    copyButton.onclick = () => this.copyLogs();

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'debugToggle';
    toggleButton.textContent = '▼ Debug Log';
    toggleButton.onclick = () => this.toggleConsole();

    // Create console
    const console = document.createElement('div');
    console.id = 'debugConsole';

    // Assemble the debug console
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(toggleButton);
    wrapper.appendChild(buttonContainer);
    wrapper.appendChild(console);
    document.body.appendChild(wrapper);

    // Load saved state
    const isHidden = localStorage.getItem('debugConsoleHidden') === 'true';
    if (isHidden) {
      wrapper.style.transform = 'translateY(100%)';
      toggleButton.textContent = '▲ Debug Log';
    }

    // Store references
    this.wrapper = wrapper;
    this.console = console;
    this.toggleButton = toggleButton;

    // Add initial test message
    this.log('Debug console initialized');
  }

  log(message) {
    const entry = document.createElement('div');
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    this.console.appendChild(entry);
    this.console.scrollTop = this.console.scrollHeight;
    
    // Also log to browser console
    console.log(message);
  }

  toggleConsole() {
    const isCurrentlyHidden = this.wrapper.style.transform === 'translateY(100%)';
    this.wrapper.style.transform = isCurrentlyHidden ? 'none' : 'translateY(100%)';
    this.toggleButton.textContent = isCurrentlyHidden ? '▼ Debug Log' : '▲ Debug Log';
    localStorage.setItem('debugConsoleHidden', !isCurrentlyHidden);
  }

  copyLogs() {
    const logText = Array.from(this.console.children)
      .map(entry => entry.textContent)
      .join('\n');
    
    navigator.clipboard.writeText(logText)
      .then(() => {
        const copyButton = document.getElementById('debugCopy');
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy logs:', err);
        const copyButton = document.getElementById('debugCopy');
        copyButton.textContent = 'Copy Failed';
        setTimeout(() => {
          copyButton.textContent = 'Copy Logs';
        }, 2000);
      });
  }
}

// Create global debug logger instance
window.debugLogger = new DebugLogger();

// Export a simple debug function
window.showDebug = function(message) {
  window.debugLogger.log(message);
}; 