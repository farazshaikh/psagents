class ChatUI {
    constructor() {
        this.chatContainer = document.getElementById('chat-container');
        this.chatForm = document.getElementById('chat-form');
        this.userInput = document.getElementById('user-input');
        this.userTemplate = document.getElementById('user-message-template');
        this.assistantTemplate = document.getElementById('assistant-message-template');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.evidenceCounter = 0;
        this.strategySelector = document.getElementById('strategy-selector');
        this.strategyButton = document.getElementById('strategy-button');
        this.selectedStrategy = document.getElementById('selected-strategy');
        this.currentStrategy = 'hybrid';
        
        this.setupEventListeners();
        this.setupStrategySelector();
        
        tippy('[data-tippy-content]', {
            theme: 'light',
            placement: 'top',
        });
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', this.handleSubmit.bind(this));
    }

    setupStrategySelector() {
        // Toggle strategy selector
        this.strategyButton.addEventListener('click', () => {
            this.strategySelector.classList.toggle('hidden');
        });

        // Close strategy selector when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.strategyButton.contains(e.target) && !this.strategySelector.contains(e.target)) {
                this.strategySelector.classList.add('hidden');
            }
        });

        // Handle strategy selection
        document.querySelectorAll('.strategy-option').forEach(option => {
            option.addEventListener('click', () => {
                const strategy = option.dataset.strategy;
                this.currentStrategy = strategy;
                this.selectedStrategy.textContent = option.querySelector('.strategy-name').textContent.replace(' (Default)', '');
                
                // Remove existing checkmarks
                document.querySelectorAll('.strategy-checkmark').forEach(check => check.remove());
                
                // Add new checkmark
                const checkmark = document.createElement('span');
                checkmark.className = 'strategy-checkmark text-blue-400 ml-2';
                checkmark.textContent = '✓';
                option.appendChild(checkmark);
                
                this.strategySelector.classList.add('hidden');
            });
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

    async handleSubmit(e) {
        e.preventDefault();
        const message = this.userInput.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        this.userInput.value = '';

        // Show loading indicator
        this.showLoading();

        try {
            const response = await fetch('/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: message,
                    inferenceStrategy: this.currentStrategy
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.addMessage(data, 'assistant');
        } catch (error) {
            console.error('Error:', error);
            let errorMessage = 'An error occurred while processing your request.';
            
            if (!navigator.onLine) {
                errorMessage = 'You appear to be offline. Please check your internet connection.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Cannot reach the server. Please check if the server is running and try again.';
            } else if (error.message.includes('status: 404')) {
                errorMessage = 'Server endpoint not found. Please check the server configuration.';
            } else if (error.message.includes('status: 5')) {
                errorMessage = 'Server error. Please try again later.';
            }

            this.addMessage({
                answer: errorMessage,
                confidence: 0,
                supporting_evidence: []
            }, 'assistant');
        } finally {
            this.hideLoading();
        }
    }

    async fetchMessageById(messageId) {
        const response = await fetch(`${config.apiBaseUrl}${config.endpoints.message}?id=${messageId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    addMessage(message, role) {
        const template = role === 'user' ? this.userTemplate : this.assistantTemplate;
        const messageElement = template.content.cloneNode(true);
        const messageText = messageElement.querySelector('.message-text');
        
        if (role === 'user') {
            messageText.textContent = message;
        } else {
            // Handle assistant response
            messageText.textContent = message.answer;
            
            // Create metadata container
            const metadataContainer = document.createElement('div');
            metadataContainer.classList.add('metadata-container', 'mt-2', 'text-sm', 'text-gray-400', 'flex', 'flex-wrap', 'items-center', 'gap-4');
            
            // Add confidence score if present
            if (message.confidence) {
                const confidenceElement = document.createElement('div');
                confidenceElement.classList.add('confidence-info');
                confidenceElement.textContent = `Confidence: ${(message.confidence * 100).toFixed(1)}%`;
                metadataContainer.appendChild(confidenceElement);
            }

            // Add strategy info
            const strategyElement = document.createElement('div');
            strategyElement.classList.add('strategy-info');
            strategyElement.textContent = `Strategy: ${this.currentStrategy.charAt(0).toUpperCase() + this.currentStrategy.slice(1)}`;
            metadataContainer.appendChild(strategyElement);
            
            // Add evidence links if present
            if (message.supporting_evidence && message.supporting_evidence.length > 0) {
                const evidenceContainer = document.createElement('div');
                evidenceContainer.classList.add('evidence-info', 'flex', 'items-center', 'gap-2');
                
                // Add "Grounding:" text
                evidenceContainer.appendChild(document.createTextNode('Grounding: '));
                
                // Add numbered links
                message.supporting_evidence.forEach((evidence, index) => {
                    if (index > 0) {
                        evidenceContainer.appendChild(document.createTextNode(' '));
                    }
                    
                    const link = document.createElement('a');
                    link.href = '#';
                    link.textContent = (index + 1).toString();
                    link.classList.add('text-blue-400', 'hover:text-blue-600', 'evidence-link');
                    
                    // Create tooltip instance immediately with loading state
                    const tooltip = tippy(link, {
                        theme: 'light',
                        placement: 'top',
                        content: evidence.relevance,
                        interactive: true,
                        onShow: async (instance) => {
                            try {
                                const response = await fetch(`/api/v1/message/id?id=${evidence.message_id}`);
                                if (!response.ok) throw new Error('Failed to fetch message');
                                const data = await response.json();
                                instance.setContent(`${evidence.relevance}\n\nOriginal message: "${data.text}"`);
                            } catch (error) {
                                console.error('Error fetching message:', error);
                                instance.setContent('Error loading message details');
                            }
                        }
                    });
                    
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                    });
                    
                    evidenceContainer.appendChild(link);
                });
                
                metadataContainer.appendChild(evidenceContainer);
            }
            
            messageText.appendChild(metadataContainer);
        }
        
        this.chatContainer.appendChild(messageElement);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}

// Initialize chat UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatUI = new ChatUI();
}); 