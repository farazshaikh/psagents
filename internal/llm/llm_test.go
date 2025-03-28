package llm

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/yourusername/psagents/config"
)

func TestOllamaLLM(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle health check
		if strings.HasSuffix(r.URL.Path, "/health") {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Handle chat request
		if r.URL.Path == "/chat" {
			// Verify request method
			if r.Method != "POST" {
				t.Errorf("Expected POST request, got %s", r.Method)
			}

			// Verify content type
			if r.Header.Get("Content-Type") != "application/json" {
				t.Errorf("Expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
			}

			// Decode request body
			var req ChatRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Errorf("Failed to decode request body: %v", err)
				return
			}

			// Verify request structure
			if req.Model != "test-model" {
				t.Errorf("Expected model test-model, got %s", req.Model)
			}
			if len(req.Messages) != 1 {
				t.Errorf("Expected 1 message, got %d", len(req.Messages))
				return
			}
			if req.Messages[0].Role != "user" {
				t.Errorf("Expected role user, got %s", req.Messages[0].Role)
			}
			if req.Messages[0].Content != "test prompt" {
				t.Errorf("Expected content 'test prompt', got %s", req.Messages[0].Content)
			}

			// Send response
			resp := ChatResponse{
				Model: "test-model",
				Message: Message{
					Role:    "assistant",
					Content: "test response",
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		// Unknown endpoint
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create test configuration
	cfg := &config.Config{
		LLM: config.LLMConfig{
			Provider: "ollama",
			Model:    "test-model",
			Endpoint: server.URL + "/chat",
			Timeout:  30,
		},
		Logging: config.LoggingConfig{
			Level:  "debug",
			Format: "text",
		},
	}

	// Create LLM instance
	llm, err := NewLLM(cfg)
	if err != nil {
		t.Fatalf("Failed to create LLM: %v", err)
	}
	defer llm.Close()

	// Test GetInference
	response, err := llm.GetInference("test prompt")
	if err != nil {
		t.Fatalf("Failed to get inference: %v", err)
	}

	// Verify response
	if response != "test response" {
		t.Errorf("Expected response 'test response', got '%s'", response)
	}
}

func TestOllamaLLMError(t *testing.T) {
	// Create test server that returns an error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle health check
		if strings.HasSuffix(r.URL.Path, "/health") {
			w.WriteHeader(http.StatusOK)
			return
		}

		resp := ChatResponse{
			Model: "test-model",
			Error: "test error",
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	// Create test configuration
	cfg := &config.Config{
		LLM: config.LLMConfig{
			Provider: "ollama",
			Model:    "test-model",
			Endpoint: server.URL + "/chat",
			Timeout:  30,
		},
		Logging: config.LoggingConfig{
			Level:  "debug",
			Format: "text",
		},
	}

	// Create LLM instance
	llm, err := NewLLM(cfg)
	if err != nil {
		t.Fatalf("Failed to create LLM: %v", err)
	}
	defer llm.Close()

	// Test GetInference with error
	_, err = llm.GetInference("test prompt")
	if err == nil {
		t.Error("Expected error, got nil")
	}
	if err.Error() != "LLM error: test error" {
		t.Errorf("Expected error 'LLM error: test error', got '%v'", err)
	}
}

func TestOllamaLLMHealthCheck(t *testing.T) {
	tests := []struct {
		name           string
		healthStatus   int
		expectedError  bool
		errorContains  string
		ollamaRunning bool
	}{
		{
			name:           "Healthy Ollama",
			healthStatus:   http.StatusOK,
			expectedError:  false,
			ollamaRunning: true,
		},
		{
			name:           "Unhealthy Ollama",
			healthStatus:   http.StatusInternalServerError,
			expectedError:  true,
			errorContains:  "health check failed with status code: 500",
			ollamaRunning: true,
		},
		{
			name:           "Ollama Not Running",
			expectedError:  true,
			errorContains:  "failed to connect to Ollama",
			ollamaRunning: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var server *httptest.Server
			if tt.ollamaRunning {
				server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(tt.healthStatus)
				}))
				defer server.Close()
			}

			cfg := &config.Config{
				LLM: config.LLMConfig{
					Provider: "ollama",
					Model:    "test-model",
					Endpoint: "http://localhost:11434/chat",
					Timeout:  1,
				},
				Logging: config.LoggingConfig{
					Level:  "debug",
					Format: "text",
				},
			}

			if tt.ollamaRunning {
				cfg.LLM.Endpoint = server.URL + "/chat"
			}

			llm := &OllamaLLM{
				cfg:    cfg,
				logger: logrus.New(),
				client: &http.Client{},
			}

			err := llm.HealthCheck()
			if tt.expectedError {
				if err == nil {
					t.Error("Expected error, got nil")
				} else if !strings.Contains(err.Error(), tt.errorContains) {
					t.Errorf("Expected error containing '%s', got '%v'", tt.errorContains, err)
				}
			} else if err != nil {
				t.Errorf("Expected no error, got %v", err)
			}
		})
	}
} 