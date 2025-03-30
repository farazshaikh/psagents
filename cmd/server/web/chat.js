class ChatUI {
    constructor() {
        this.chatContainer = document.getElementById('chat-container');
        this.chatForm = document.getElementById('chat-form');
        this.userInput = document.getElementById('user-input');
        this.userTemplate = document.getElementById('user-message-template');
        this.assistantTemplate = document.getElementById('assistant-message-template');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.evidenceCounter = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = this.userInput.value.trim();
            if (message) {
                await this.handleUserMessage(message);
                this.userInput.value = '';
            }
        });
    }

    showLoading() {
        this.loadingIndicator.classList.remove('hidden');
        this.chatContainer.appendChild(this.loadingIndicator);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    hideLoading() {
        this.loadingIndicator.classList.add('hidden');
        if (this.loadingIndicator.parentNode === this.chatContainer) {
            this.chatContainer.removeChild(this.loadingIndicator);
        }
    }

    async handleUserMessage(message) {
        // Add user message to chat
        this.addMessage('user', message);
        
        try {
            this.showLoading();
            // Send message to API
            const response = await this.sendMessage(message);
            
            // Add assistant response to chat
            this.addMessage('assistant', response.answer, response.supporting_evidence);
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('assistant', 'Sorry, there was an error processing your request.');
        } finally {
            this.hideLoading();
        }
    }

    async sendMessage(message) {
        const response = await fetch(`${config.apiBaseUrl}${config.endpoints.chat}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: message }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    async fetchMessageById(messageId) {
        const response = await fetch(`${config.apiBaseUrl}${config.endpoints.message}?id=${messageId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    addMessage(type, text, evidence = []) {
        const template = type === 'user' ? this.userTemplate : this.assistantTemplate;
        const messageElement = template.content.cloneNode(true);
        
        // Set message text
        messageElement.querySelector('.message-text').textContent = text;

        // Add evidence if present
        if (evidence && evidence.length > 0) {
            const evidenceContainer = messageElement.querySelector('.evidence-container');
            
            // Add "Grounding:" label
            const groundingLabel = document.createElement('span');
            groundingLabel.className = 'text-gray-600 mr-2';
            groundingLabel.textContent = 'Grounding:';
            evidenceContainer.appendChild(groundingLabel);

            // Add numbered links
            evidence.forEach((ev, index) => {
                // Add number link
                const evidenceLink = document.createElement('span');
                evidenceLink.className = 'evidence-link cursor-pointer';
                evidenceLink.textContent = (index + 1).toString();
                
                // Create tooltip instance
                const tooltip = tippy(evidenceLink, {
                    ...config.ui.evidenceTooltip,
                    allowHTML: true,
                    content: 'Loading...',
                    onShow: async (instance) => {
                        try {
                            const message = await this.fetchMessageById(ev.message_id);
                            instance.setContent(`
                                <div class="p-2">
                                    <div class="font-bold mb-1">Supporting Evidence #${index + 1}</div>
                                    <div class="text-sm">${message.text}</div>
                                    <div class="mt-1 text-xs text-gray-500">Relevance: ${ev.relevance}</div>
                                </div>
                            `);
                        } catch (error) {
                            instance.setContent('Error loading message');
                        }
                    },
                });
                
                evidenceContainer.appendChild(evidenceLink);

                // Add space after each number except the last one
                if (index < evidence.length - 1) {
                    const space = document.createElement('span');
                    space.className = 'mx-1';
                    space.textContent = ' ';
                    evidenceContainer.appendChild(space);
                }
            });
        }

        // Add message to chat
        this.chatContainer.appendChild(messageElement);
        
        // Scroll to bottom
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}

// Initialize chat UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatUI = new ChatUI();
}); 