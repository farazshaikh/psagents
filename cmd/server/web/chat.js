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
                        console.log(`${strategy} response:`, response);
                        const strategyLabels = {
                            'similarity': 'Similarity (Vector)',
                            'semantic': 'Semantic (LLM Knowledge Graph)',
                            'hybrid': 'Hybrid'
                        };
                        
                        this.addAssistantMessage(response.answer || response.message, {
                            strategy: strategyLabels[strategy],
                            confidence: response.confidence,
                            evidence: response.supporting_evidence || response.evidence || response.grounding || []
                        });
                    } catch (error) {
                        console.error(`Error with ${strategy} strategy:`, error);
                        this.addErrorMessage(`Error with ${strategy} strategy: ${this.getErrorMessage(error)}`);
                    }
                }
            } else {
                const response = await this.sendMessage(message, this.currentStrategy);
                console.log('Response:', response);
                this.addAssistantMessage(response.answer || response.message, {
                    strategy: this.getStrategyLabel(this.currentStrategy),
                    confidence: response.confidence,
                    evidence: response.supporting_evidence || response.evidence || response.grounding || []
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
        console.log('Adding assistant message with metadata:', metadata);
        const messageNode = this.assistantTemplate.content.cloneNode(true);
        const messageText = messageNode.querySelector('.message-text');
        messageText.textContent = text || 'No response received';

        // Handle metadata
        const metadataContainer = messageNode.querySelector('.metadata-container');
        
        // Handle confidence
        if (metadata.confidence) {
            const confidenceValue = messageNode.querySelector('.confidence-value');
            confidenceValue.textContent = `${Math.round(metadata.confidence * 100)}%`;
        } else {
            const confidenceInfo = messageNode.querySelector('.confidence-info');
            confidenceInfo.style.display = 'none';
        }

        // Handle strategy
        if (metadata.strategy) {
            const strategyValue = messageNode.querySelector('.strategy-value');
            strategyValue.textContent = metadata.strategy;
        } else {
            const strategyInfo = messageNode.querySelector('.strategy-info');
            strategyInfo.style.display = 'none';
        }

        // Handle evidence/grounding
        const groundingNumbers = messageNode.querySelector('.grounding-numbers');
        if (metadata.evidence && Array.isArray(metadata.evidence) && metadata.evidence.length > 0) {
            console.log('Processing evidence:', metadata.evidence);
            
            // Create a container for the grounding numbers
            const numbersContainer = document.createElement('div');
            numbersContainer.className = 'flex items-center gap-1';
            
            metadata.evidence.forEach((evidence, index) => {
                // Get evidence text, handling different possible formats
                let evidenceText = '';
                if (typeof evidence === 'string') {
                    evidenceText = evidence;
                } else if (evidence && typeof evidence === 'object') {
                    if (evidence.text) {
                        evidenceText = evidence.text;
                    } else if (evidence.message) {
                        evidenceText = evidence.message;
                    } else if (evidence.relevance) {
                        // Handle supporting_evidence format
                        evidenceText = evidence.relevance;
                    } else {
                        evidenceText = JSON.stringify(evidence);
                    }
                }
                
                if (evidenceText) {
                    console.log(`Creating grounding number ${index + 1} with text:`, evidenceText);
                    
                    // Create grounding number button
                    const numberButton = document.createElement('button');
                    numberButton.className = 'grounding-number';
                    numberButton.textContent = index + 1;
                    
                    // Initialize tooltip
                    tippy(numberButton, {
                        content: evidenceText,
                        theme: 'light',
                        placement: 'bottom',
                        interactive: true,
                        allowHTML: true,
                        maxWidth: 300,
                        delay: [0, 200],
                        animation: 'fade'
                    });
                    
                    numbersContainer.appendChild(numberButton);
                }
            });

            // Only add the container if we have any evidence
            if (numbersContainer.children.length > 0) {
                groundingNumbers.appendChild(numbersContainer);
            } else {
                groundingNumbers.style.display = 'none';
            }
        } else {
            groundingNumbers.style.display = 'none';
        }

        // If no metadata is present, hide the container
        if (!metadata.confidence && !metadata.strategy && (!metadata.evidence || metadata.evidence.length === 0)) {
            metadataContainer.style.display = 'none';
        }

        this.chatContainer.appendChild(messageNode);
        this.scrollToBottom();
    }

    addErrorMessage(errorText) {
        const messageNode = this.assistantTemplate.content.cloneNode(true);
        const messageText = messageNode.querySelector('.message-text');
        messageText.textContent = errorText;
        messageText.classList.add('text-red-400');
        
        // Hide metadata for error messages
        const metadataContainer = messageNode.querySelector('.metadata-container');
        metadataContainer.style.display = 'none';
        
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

        const data = await response.json();
        console.log('API Response:', data); // Debug log
        return data;
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}

// Initialize chat UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatUI = new ChatUI();
}); 