class ChatUI {
    constructor() {
        this.chatContainer = document.getElementById('chat-container');
        this.chatForm = document.getElementById('chat-form');
        this.userInput = document.getElementById('user-input');
        this.userTemplate = document.getElementById('user-message-template');
        this.assistantTemplate = document.getElementById('assistant-message-template');
        this.loadingTemplate = document.getElementById('loading-template');
        this.evidenceCounter = 0;
        this.strategySelector = document.getElementById('strategy-selector');
        this.strategyButton = document.getElementById('strategy-button');
        this.selectedStrategy = document.getElementById('selected-strategy');
        this.currentStrategy = 'hybrid'; // Default to hybrid
        this.strategyOrder = ['similarity', 'semantic', 'hybrid'];
        this.evalResponses = new Map();
        
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
                this.selectedStrategy.textContent = option.querySelector('.strategy-name').textContent;
                
                // Update checkmarks
                document.querySelectorAll('.strategy-option').forEach(opt => {
                    const checkmark = opt.querySelector('.strategy-checkmark');
                    if (checkmark) checkmark.remove();
                });
                
                const checkmark = document.createElement('span');
                checkmark.className = 'strategy-checkmark';
                checkmark.textContent = '✓';
                option.appendChild(checkmark);
                
                this.strategySelector.classList.add('hidden');
            });
        });
    }

    showLoading() {
        const loadingNode = this.loadingTemplate.content.cloneNode(true);
        this.chatContainer.appendChild(loadingNode);
        this.scrollToBottom();
    }

    hideLoading() {
        const loadingElement = this.chatContainer.querySelector('.loading-dots')?.closest('.message');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const message = this.userInput.value.trim();
        
        if (message === '') return;
        
        // Clear input and add user message
        this.userInput.value = '';
        this.addUserMessage(message);
        
        // Show loading indicator
        this.showLoading();
        
        try {
            if (this.currentStrategy === 'eval') {
                // Make sequential requests for each strategy
                for (const strategy of this.strategyOrder) {
                    try {
                        const response = await this.sendMessage(message, strategy);
                        const strategyLabels = {
                            'similarity': 'Similarity (Vector)',
                            'semantic': 'Semantic (LLM Knowledge Graph)',
                            'hybrid': 'Hybrid'
                        };
                        
                        this.addAssistantMessage(response.answer, {
                            strategy: strategyLabels[strategy],
                            confidence: response.confidence,
                            evidence: response.evidence
                        });
                    } catch (error) {
                        console.error(`Error with ${strategy} strategy:`, error);
                        this.addErrorMessage(`Error with ${strategy} strategy: ${this.getErrorMessage(error)}`);
                    }
                }
            } else {
                const response = await this.sendMessage(message, this.currentStrategy);
                this.addAssistantMessage(response.answer, {
                    strategy: this.getStrategyLabel(this.currentStrategy),
                    confidence: response.confidence,
                    evidence: response.evidence
                });
            }
        } catch (error) {
            console.error('Error:', error);
            this.addErrorMessage(this.getErrorMessage(error));
        }
        
        // Hide loading indicator
        this.hideLoading();
    }

    getErrorMessage(error) {
        if (!navigator.onLine) {
            return 'You appear to be offline. Please check your internet connection.';
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return 'Cannot reach the server. Please check if the server is running and try again.';
        }
        if (error.message.includes('404')) {
            return 'Server endpoint not found. Please check the server configuration.';
        }
        if (error.message.includes('500')) {
            return 'Server error. Please try again later.';
        }
        return 'An error occurred while processing your request.';
    }

    addUserMessage(text) {
        const messageNode = this.userTemplate.content.cloneNode(true);
        const messageText = messageNode.querySelector('.message-text');
        messageText.textContent = text;
        this.chatContainer.appendChild(messageNode);
        this.scrollToBottom();
    }

    addAssistantMessage(text, metadata = {}) {
        const messageNode = this.assistantTemplate.content.cloneNode(true);
        const messageText = messageNode.querySelector('.message-text');
        messageText.textContent = text || 'No response received';

        // Handle metadata
        if (metadata.confidence) {
            const confidenceValue = messageNode.querySelector('.confidence-value');
            confidenceValue.textContent = `${Math.round(metadata.confidence * 100)}%`;
        }

        if (metadata.strategy) {
            const strategyValue = messageNode.querySelector('.strategy-value');
            strategyValue.textContent = metadata.strategy;
        }

        if (metadata.evidence && metadata.evidence.length > 0) {
            const evidenceLinks = messageNode.querySelector('.evidence-links');
            metadata.evidence.forEach((evidence, index) => {
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'evidence-link';
                link.textContent = `Message ${index + 1}`;
                link.dataset.message = evidence.text || evidence;
                
                // Initialize tooltip
                tippy(link, {
                    content: evidence.text || evidence,
                    theme: 'light',
                    placement: 'bottom',
                    interactive: true,
                    allowHTML: true
                });

                evidenceLinks.appendChild(link);
            });
        } else {
            const evidenceInfo = messageNode.querySelector('.evidence-info');
            evidenceInfo.style.display = 'none';
        }

        this.chatContainer.appendChild(messageNode);
        this.scrollToBottom();
    }

    addErrorMessage(errorText) {
        const messageNode = this.assistantTemplate.content.cloneNode(true);
        const messageText = messageNode.querySelector('.message-text');
        messageText.textContent = errorText;
        messageText.classList.add('text-red-400');
        
        this.chatContainer.appendChild(messageNode);
        this.scrollToBottom();
    }

    getStrategyLabel(strategy) {
        const labels = {
            'eval': 'Eval (Compare All)',
            'hybrid': 'Hybrid',
            'similarity': 'Similarity (Vector)',
            'semantic': 'Semantic (LLM Knowledge Graph)'
        };
        return labels[strategy] || strategy;
    }

    async sendMessage(message, strategy) {
        const response = await fetch('/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                inferenceStrategy: strategy
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}

// Initialize chat UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatUI = new ChatUI();
}); 