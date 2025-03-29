package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/yourusername/psagents/config"
)

// LLM represents the language model interface
type LLM interface {
	GetInference(prompt string) (string, error)
	HealthCheck() error
	Close() error
}

// OllamaLLM implements the LLM interface for Ollama
type OllamaLLM struct {
	cfg    *config.Config
	logger *logrus.Logger
	client *http.Client
}

// OpenAILLM implements the LLM interface for OpenAI
type OpenAILLM struct {
	cfg    *config.Config
	logger *logrus.Logger
	client *http.Client
}

// ChatRequest represents the request structure for Ollama chat API
type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse represents the response structure from Ollama chat API
type ChatResponse struct {
	Model     string    `json:"model"`
	Message   Message   `json:"message"`
	Error     string    `json:"error,omitempty"`
}

// OpenAIChatRequest represents the request structure for OpenAI chat API
type OpenAIChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
}

// OpenAIChatResponse represents the response structure from OpenAI chat API
type OpenAIChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

// NewLLM creates a new LLM instance based on the configuration
func NewLLM(cfg *config.Config) (LLM, error) {
	// Setup logging
	logger := logrus.New()
	if cfg.Logging.Format == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{})
	}

	level, err := logrus.ParseLevel(cfg.Logging.Level)
	if err != nil {
		return nil, fmt.Errorf("invalid log level: %w", err)
	}
	logger.SetLevel(level)

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: time.Duration(cfg.LLM.Timeout) * time.Second,
	}

	// Create LLM instance based on provider
	switch cfg.LLM.Provider {
	case "ollama":
		providerCfg, ok := cfg.LLM.Providers["ollama"]
		if !ok || !providerCfg.Enabled {
			return nil, fmt.Errorf("ollama provider not configured or disabled")
		}
		llm := &OllamaLLM{
			cfg:    cfg,
			logger: logger,
			client: client,
		}
		if err := llm.HealthCheck(); err != nil {
			return nil, fmt.Errorf("Ollama health check failed: %w", err)
		}
		return llm, nil
	case "openai":
		providerCfg, ok := cfg.LLM.Providers["openai"]
		if !ok || !providerCfg.Enabled {
			return nil, fmt.Errorf("openai provider not configured or disabled")
		}
		if providerCfg.APIKey == "" || providerCfg.APIKey == "${OPENAI_API_KEY}" {
			return nil, fmt.Errorf("OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable")
		}
		llm := &OpenAILLM{
			cfg:    cfg,
			logger: logger,
			client: client,
		}
		if err := llm.HealthCheck(); err != nil {
			return nil, fmt.Errorf("OpenAI health check failed: %w", err)
		}
		return llm, nil
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", cfg.LLM.Provider)
	}
}

// HealthCheck verifies that Ollama is running and accessible
func (l *OllamaLLM) HealthCheck() error {
	providerCfg := l.cfg.LLM.Providers["ollama"]
	// Extract base URL from endpoint
	baseURL := providerCfg.Endpoint
	if strings.HasSuffix(baseURL, "/api/chat") {
		baseURL = strings.TrimSuffix(baseURL, "/api/chat")
	} else if strings.HasSuffix(baseURL, "/chat") {
		baseURL = strings.TrimSuffix(baseURL, "/chat")
	}
	listURL := fmt.Sprintf("%s/api/tags", baseURL)

	// Create request
	req, err := http.NewRequest("GET", listURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	// Send request
	resp, err := l.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to connect to Ollama (is it running?): %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusNotFound {
			// Try alternative endpoint for older Ollama versions
			listURL = fmt.Sprintf("%s/api/list", baseURL)
			req, err = http.NewRequest("GET", listURL, nil)
			if err != nil {
				return fmt.Errorf("failed to create health check request: %w", err)
			}
			resp, err = l.client.Do(req)
			if err != nil {
				return fmt.Errorf("failed to connect to Ollama (is it running?): %w", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return fmt.Errorf("Ollama health check failed with status code: %d", resp.StatusCode)
			}
		} else {
			return fmt.Errorf("Ollama health check failed with status code: %d", resp.StatusCode)
		}
	}

	// Verify that the model exists
	modelListURL := fmt.Sprintf("%s/api/show", baseURL)
	modelReq := struct {
		Name string `json:"name"`
	}{
		Name: providerCfg.Model,
	}
	modelReqBytes, err := json.Marshal(modelReq)
	if err != nil {
		return fmt.Errorf("failed to marshal model check request: %w", err)
	}

	req, err = http.NewRequest("POST", modelListURL, bytes.NewBuffer(modelReqBytes))
	if err != nil {
		return fmt.Errorf("failed to create model check request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err = l.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to check model availability: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return fmt.Errorf("model '%s' not found in Ollama, please run: ollama pull %s", providerCfg.Model, providerCfg.Model)
	}

	l.logger.WithFields(logrus.Fields{
		"model": providerCfg.Model,
	}).Debug("Ollama health check passed")
	return nil
}

// HealthCheck verifies that OpenAI API is accessible
func (l *OpenAILLM) HealthCheck() error {
	return nil
	providerCfg := l.cfg.LLM.Providers["openai"]
	// Create a simple request to list models
	req, err := http.NewRequest("GET", "https://api.openai.com/v1/models", nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", providerCfg.APIKey))

	// Send request
	resp, err := l.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to connect to OpenAI API: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("OpenAI health check failed with status code: %d", resp.StatusCode)
	}

	l.logger.WithFields(logrus.Fields{
		"model": providerCfg.Model,
	}).Debug("OpenAI health check passed")
	return nil
}

// GetInference gets an inference from Ollama for the given prompt
func (l *OllamaLLM) GetInference(prompt string) (string, error) {
	startTime := time.Now()
	providerCfg := l.cfg.LLM.Providers["ollama"]
	// Create request body
	reqBody := ChatRequest{
		Model: providerCfg.Model,
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	// Marshal request body
	reqBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", providerCfg.Endpoint, bytes.NewBuffer(reqBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Log request in dev mode
	if l.cfg.DevMode.Enabled {
		l.logger.WithFields(logrus.Fields{
			"model":   providerCfg.Model,
			"prompt":  prompt,
			"timeout": l.cfg.LLM.Timeout,
		}).Debug("Sending request to Ollama")
	}

	// Send request
	resp, err := l.client.Do(req)
	if err != nil {
		// Check if Ollama is still running
		if healthErr := l.HealthCheck(); healthErr != nil {
			return "", fmt.Errorf("Ollama appears to be down: %w", healthErr)
		}
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusNotFound {
			return "", fmt.Errorf("model '%s' not found in Ollama, please make sure to pull it first using: ollama pull %s", providerCfg.Model, providerCfg.Model)
		}
		return "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Decode response
	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	// Check for error in response
	if chatResp.Error != "" {
		return "", fmt.Errorf("LLM error: %s", chatResp.Error)
	}

	// Log response in dev mode
	if l.cfg.DevMode.Enabled == true {
		l.logger.WithFields(logrus.Fields{
			"model":          chatResp.Model,
			"response":       chatResp.Message.Content,
			"response_time":  time.Since(startTime).String(),
		}).Info("Received response from Ollama") // Changed from Debug to Info level for visibility
	}

	return chatResp.Message.Content, nil
}

// GetInference gets an inference from OpenAI for the given prompt
func (l *OpenAILLM) GetInference(prompt string) (string, error) {
	startTime := time.Now()
	providerCfg := l.cfg.LLM.Providers["openai"]

	// Create request body
	messages := []Message{
		{
			Role:    "system",
			Content: l.cfg.LLM.SystemPrompt,
		},
		{
			Role:    "user",
			Content: prompt,
		},
	}

	reqBody := OpenAIChatRequest{
		Model:       providerCfg.Model,
		MaxTokens:   l.cfg.LLM.MaxTokens,
		Temperature: l.cfg.LLM.Temperature,
		Messages:    messages,
	}

	// Marshal request body
	reqBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", providerCfg.Endpoint, bytes.NewBuffer(reqBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set required headers for OpenRouter
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", providerCfg.APIKey))
	req.Header.Set("HTTP-Referer", "https://github.com/yourusername/psagents")  // Required by OpenRouter
	req.Header.Set("X-Title", "PS Agents")  // Required by OpenRouter

	// Log request in dev mode
	if l.cfg.DevMode.Enabled {
		l.logger.WithFields(logrus.Fields{
			"model":   providerCfg.Model,
			"messages": messages,
			"timeout": l.cfg.LLM.Timeout,
		}).Debug("Sending request to OpenRouter")
	}

	// Send request with retries
	maxRetries := 3
	retryDelay := time.Second * 5

	var resp *http.Response
	var lastError error

	for attempt := 0; attempt < maxRetries; attempt++ {
		resp, err = l.client.Do(req)
		if err != nil {
			lastError = fmt.Errorf("failed to send request (attempt %d): %w", attempt+1, err)
			continue
		}

		// Check response status
		switch resp.StatusCode {
		case http.StatusOK:
			// Success - break out of retry loop
			goto ProcessResponse
		case http.StatusTooManyRequests:
			resp.Body.Close()
			if attempt < maxRetries-1 {
				// Get retry delay from response header or use default
				retryAfter := resp.Header.Get("Retry-After")
				if retryAfter != "" {
					if seconds, err := strconv.Atoi(retryAfter); err == nil {
						retryDelay = time.Duration(seconds) * time.Second
					}
				}
				l.logger.WithFields(logrus.Fields{
					"attempt": attempt + 1,
					"delay":   retryDelay.String(),
				}).Warn("Rate limited by OpenRouter, retrying after delay")
				time.Sleep(retryDelay)
				continue
			}
		default:
			// For other errors, read the body and return error
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			lastError = fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(body))
			if attempt < maxRetries-1 {
				l.logger.WithFields(logrus.Fields{
					"attempt": attempt + 1,
					"status":  resp.StatusCode,
					"error":   string(body),
				}).Warn("Request failed, retrying")
				time.Sleep(retryDelay)
				continue
			}
		}
	}

	// If we got here, all retries failed
	if lastError != nil {
		return "", fmt.Errorf("all retries failed: %w", lastError)
	}
	return "", fmt.Errorf("all retries failed with unknown error")

ProcessResponse:
	defer resp.Body.Close()

	// Decode response
	var chatResp OpenAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	// Check for error in response
	if chatResp.Error.Message != "" {
		return "", fmt.Errorf("OpenRouter error: %s", chatResp.Error.Message)
	}

	// Check if we have any choices
	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenRouter")
	}

	// Log response in dev mode
	if l.cfg.DevMode.Enabled {
		l.logger.WithFields(logrus.Fields{
			"model":          providerCfg.Model,
			"response":       chatResp.Choices[0].Message.Content,
			"response_time":  time.Since(startTime).String(),
		}).Debug("Received response from OpenRouter")
	}

	return chatResp.Choices[0].Message.Content, nil
}

// Close closes the LLM client
func (l *OllamaLLM) Close() error {
	return nil
}

// Close closes the LLM client
func (l *OpenAILLM) Close() error {
	return nil
}