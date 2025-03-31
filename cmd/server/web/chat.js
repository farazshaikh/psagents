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
        this.currentStrategy = 'hybrid';
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
        const strategyButton = document.querySelector('.strategy-button');
        const strategyDropdown = document.querySelector('.strategy-dropdown');
        const strategyOptions = document.querySelectorAll('.strategy-option');
        const strategyText = document.querySelector('.strategy-text');

        // Set initial state
        strategyText.textContent = 'Hybrid';
        this.currentStrategy = 'hybrid';
        
        // Show checkmark for hybrid by default
        strategyOptions.forEach(option => {
            const check = option.querySelector('.strategy-check');
            if (option.dataset.strategy === 'hybrid') {
                check.classList.remove('hidden');
            } else {
                check.classList.add('hidden');
            }
        });

        // Prevent event propagation for the entire strategy selector
        document.querySelector('.strategy-selector').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        strategyButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            strategyDropdown.classList.toggle('hidden');
        });

        strategyOptions.forEach(option => {
            option.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const strategy = option.dataset.strategy;
                strategyText.textContent = option.querySelector('span').textContent;
                this.currentStrategy = strategy;
                
                // Update checkmarks
                strategyOptions.forEach(opt => {
                    const check = opt.querySelector('.strategy-check');
                    if (opt.dataset.strategy === strategy) {
                        check.classList.remove('hidden');
                    } else {
                        check.classList.add('hidden');
                    }
                });
                
                strategyDropdown.classList.add('hidden');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.strategy-selector')) {
                strategyDropdown.classList.add('hidden');
            }
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

        // Function to truncate text
        const truncateText = (text, maxLength = 150) => {
            if (text && text.length > maxLength) {
                return text.substring(0, maxLength) + '...';
            }
            return text;
        };

        // Handle evidence/grounding
        const groundingNumbers = messageNode.querySelector('.grounding-numbers');
        if (metadata.evidence && Array.isArray(metadata.evidence) && metadata.evidence.length > 0) {
            console.log('Processing evidence:', metadata.evidence);
            
            // Create a container for the grounding numbers
            const numbersContainer = document.createElement('div');
            numbersContainer.className = 'flex items-center gap-1';
            
            metadata.evidence.forEach((evidence, index) => {
                // Get evidence text and format tooltip content
                let tooltipContent = '';
                if (typeof evidence === 'string') {
                    tooltipContent = truncateText(evidence);
                } else if (evidence && typeof evidence === 'object') {
                    if (evidence.relevance && evidence.message) {
                        // Format for supporting_evidence with message text
                        tooltipContent = `
                            <div class="tooltip-content">
                                <div class="tooltip-relevance">${evidence.relevance}</div>
                                <div class="tooltip-divider"></div>
                                <div class="tooltip-message">${truncateText(evidence.message)}</div>
                            </div>
                        `;
                    } else if (evidence.relevance && evidence.message_id) {
                        // Format for supporting_evidence with message_id
                        tooltipContent = `
                            <div class="tooltip-content">
                                <div class="tooltip-relevance">${evidence.relevance}</div>
                                <div class="tooltip-divider"></div>
                                <div class="tooltip-message-id">ID: ${truncateText(evidence.message_id, 20)}</div>
                                <div class="tooltip-divider"></div>
                                <div class="tooltip-message">Loading message...</div>
                            </div>
                        `;

                        // Create grounding number button
                        const numberButton = document.createElement('button');
                        numberButton.className = 'grounding-number';
                        numberButton.textContent = index + 1;
                        
                        // Initialize tooltip
                        const tooltip = tippy(numberButton, {
                            content: tooltipContent,
                            theme: 'light',
                            placement: 'bottom',
                            interactive: true,
                            allowHTML: true,
                            maxWidth: 400,
                            delay: [0, 200],
                            animation: 'fade'
                        });

                        // Fetch the message text if not provided
                        if (!evidence.text) {
                            this.fetchMessageText(evidence.message_id).then(messageText => {
                                if (messageText) {
                                    tooltip.setContent(`
                                        <div class="tooltip-content">
                                            <div class="tooltip-relevance">${evidence.relevance}</div>
                                            <div class="tooltip-divider"></div>
                                            <div class="tooltip-message-id">ID: ${truncateText(evidence.message_id, 20)}</div>
                                            <div class="tooltip-divider"></div>
                                            <div class="tooltip-message">${truncateText(messageText)}</div>
                                        </div>
                                    `);
                                }
                            });
                        }
                        
                        numbersContainer.appendChild(numberButton);
                    } else if (evidence.text) {
                        tooltipContent = truncateText(evidence.text);
                    } else if (evidence.message) {
                        tooltipContent = truncateText(evidence.message);
                    } else {
                        tooltipContent = truncateText(JSON.stringify(evidence));
                    }
                }
                
                if (tooltipContent && !evidence.message_id) {
                    console.log(`Creating grounding number ${index + 1} with content:`, tooltipContent);
                    
                    // Create grounding number button
                    const numberButton = document.createElement('button');
                    numberButton.className = 'grounding-number';
                    numberButton.textContent = index + 1;
                    
                    // Initialize tooltip
                    tippy(numberButton, {
                        content: tooltipContent,
                        theme: 'light',
                        placement: 'bottom',
                        interactive: true,
                        allowHTML: true,
                        maxWidth: 400,
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

    // Helper function to fetch message text by ID
    async fetchMessageText(messageId) {
        try {
            const response = await fetch(`/api/v1/message/id?id=${messageId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.text || data.message || data.content || data.Message;
        } catch (error) {
            console.error('Error fetching message text:', error);
            return 'Failed to load message';
        }
    }
}

// Initialize chat UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatUI = new ChatUI();
}); 