// Configuration for the chat interface
const config = {
    // Base URL for the API endpoints
    apiBaseUrl: 'http://localhost:8080/api/v1',

    // Endpoints
    endpoints: {
        chat: '/chat/completions',
        message: '/message/id',
    },

    // UI Configuration
    ui: {
        // Maximum number of messages to show in the chat
        maxMessages: 100,
        
        // Typing indicator delay in milliseconds
        typingDelay: 50,
        
        // Evidence tooltip configuration
        evidenceTooltip: {
            theme: 'light',
            placement: 'top',
            arrow: true,
            interactive: true,
            appendTo: document.body,
        },
    },
}; 