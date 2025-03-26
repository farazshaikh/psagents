package embeddings

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/yourusername/psagents/config"
)

// MessageEmbedding represents a text message and its embedding
type MessageEmbedding struct {
	Text      string    `json:"text"`
	Embedding []float32 `json:"embedding"`
}

// Generator handles embedding generation
type Generator struct {
	cfg    *config.Config
	logger *logrus.Logger
}

// NewGenerator creates a new embedding generator
func NewGenerator(cfg *config.Config) (*Generator, error) {
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

	// Create output directory if it doesn't exist
	if err := os.MkdirAll(cfg.Data.OutputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	return &Generator{
		cfg:    cfg,
		logger: logger,
	}, nil
}

// GenerateEmbeddings reads messages from the input directory and generates embeddings
func (g *Generator) GenerateEmbeddings() error {
	// Read messages from input directory
	messages, err := g.readMessages()
	if err != nil {
		return fmt.Errorf("failed to read messages: %w", err)
	}

	// Generate embeddings
	embeddings := make([]MessageEmbedding, 0, len(messages))
	for _, msg := range messages {
		embedding, err := g.generateEmbedding(msg)
		if err != nil {
			g.logger.WithError(err).WithField("message", msg).Error("Failed to generate embedding")
			continue
		}
		embeddings = append(embeddings, MessageEmbedding{
			Text:      msg,
			Embedding: embedding,
		})
	}

	// Save embeddings to output file
	outputPath := filepath.Join(g.cfg.Data.OutputDir, "messages_embeddings.jsonl")
	if err := g.saveEmbeddings(outputPath, embeddings); err != nil {
		return fmt.Errorf("failed to save embeddings: %w", err)
	}

	g.logger.WithFields(logrus.Fields{
		"input_count":  len(messages),
		"output_count": len(embeddings),
		"output_file":  outputPath,
	}).Info("Successfully generated embeddings")

	return nil
}

// readMessages reads messages from the input directory
func (g *Generator) readMessages() ([]string, error) {
	// TODO: Implement message reading from input directory
	// For now, return a test message
	return []string{"This is a test message"}, nil
}

// generateEmbedding generates an embedding for a single message
func (g *Generator) generateEmbedding(text string) ([]float32, error) {
	// Get API key from environment if it's a variable reference
	apiKey := g.cfg.LLM.APIKey
	if apiKey == "${OPENAI_API_KEY}" {
		apiKey = os.Getenv("OPENAI_API_KEY")
		if apiKey == "" {
			return nil, fmt.Errorf("OPENAI_API_KEY environment variable not set")
		}
	}

	// Create HTTP client
	client := &http.Client{
		Timeout: time.Duration(g.cfg.LLM.Timeout) * time.Second,
	}

	// Prepare request body for OpenRouter format
	reqBody := map[string]interface{}{
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": text,
			},
		},
		"model": g.cfg.Embeddings.Model,
		"stream": false,
	}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request using endpoint from config
	apiURL := fmt.Sprintf("%s/embeddings", g.cfg.LLM.Endpoint)
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers for OpenRouter
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("HTTP-Referer", "https://github.com/yourusername/psagents") // Replace with your actual repo
	req.Header.Set("X-Title", "PS Agents")

	// Make request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var result struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(result.Data) == 0 || len(result.Data[0].Embedding) == 0 {
		return nil, fmt.Errorf("no embedding in response")
	}

	g.logger.WithFields(logrus.Fields{
		"text_length": len(text),
		"embedding_dimension": len(result.Data[0].Embedding),
		"model": g.cfg.Embeddings.Model,
		"provider": g.cfg.LLM.Provider,
	}).Debug("Generated embedding")

	return result.Data[0].Embedding, nil
}

// saveEmbeddings saves embeddings to a JSONL file
func (g *Generator) saveEmbeddings(path string, embeddings []MessageEmbedding) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("failed to create output file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	for _, emb := range embeddings {
		if err := encoder.Encode(emb); err != nil {
			return fmt.Errorf("failed to encode embedding: %w", err)
		}
	}

	return nil
}

// CreateDevFile creates a development file with the first 20 messages
func (g *Generator) CreateDevFile() error {
	inputPath := filepath.Join(g.cfg.Data.InputDir, "messages.jsonl")
	outputPath := filepath.Join(g.cfg.Data.InputDir, "messages_dev.jsonl")

	// Open input file
	inputFile, err := os.Open(inputPath)
	if err != nil {
		return fmt.Errorf("failed to open input file: %w", err)
	}
	defer inputFile.Close()

	// Create output file
	outputFile, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create output file: %w", err)
	}
	defer outputFile.Close()

	decoder := json.NewDecoder(inputFile)
	encoder := json.NewEncoder(outputFile)
	count := 0

	// Copy first 20 messages
	for count < 20 {
		var msg MessageEmbedding
		if err := decoder.Decode(&msg); err != nil {
			if err.Error() == "EOF" {
				break
			}
			return fmt.Errorf("failed to decode message: %w", err)
		}
		if err := encoder.Encode(msg); err != nil {
			return fmt.Errorf("failed to encode message: %w", err)
		}
		count++
	}

	g.logger.WithFields(logrus.Fields{
		"input_file":  inputPath,
		"output_file": outputPath,
		"message_count": count,
	}).Info("Successfully created development file")

	return nil
}