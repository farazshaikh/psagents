package embeddings

import (
	"bufio"
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
	inputFile := "messages.jsonl"
	if g.cfg.DevMode.Enabled {
		inputFile = "messages_dev.jsonl"
	}

	filePath := filepath.Join(g.cfg.Data.InputDir, inputFile)
	g.logger.WithField("file", filePath).Info("Reading messages from file")

	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open input file: %w", err)
	}
	defer file.Close()

	var messages []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		// Parse the JSON line to extract just the text
		var msg struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal([]byte(line), &msg); err != nil {
			return nil, fmt.Errorf("failed to parse message JSON: %w", err)
		}
		messages = append(messages, msg.Text)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading input file: %w", err)
	}

	g.logger.WithField("count", len(messages)).Info("Read messages from file")
	return messages, nil
}

// generateEmbedding generates an embedding for a single message
func (g *Generator) generateEmbedding(text string) ([]float32, error) {
	// Create HTTP client
	client := &http.Client{
		Timeout: time.Duration(g.cfg.LLM.Timeout) * time.Second,
	}

	// Prepare request body
	reqBody := map[string]interface{}{
		"model":  g.cfg.Embeddings.Model,
		"prompt": text,
	}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Use the embeddings-specific endpoint
	req, err := http.NewRequest("POST", g.cfg.Embeddings.Endpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

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

	// Parse Ollama response format
	var result struct {
		Embedding []float32 `json:"embedding"`
		Error    string    `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Error != "" {
		return nil, fmt.Errorf("API error: %s", result.Error)
	}

	if result.Embedding == nil || len(result.Embedding) == 0 {
		return nil, fmt.Errorf("no embedding in response")
	}

	g.logger.WithFields(logrus.Fields{
		"text_length":         len(text),
		"embedding_dimension": len(result.Embedding),
		"model":              g.cfg.Embeddings.Model,
	}).Debug("Generated embedding")

	return result.Embedding, nil
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

// CreateDevFile creates a development file with the first N messages from messages.jsonl
// for development purposes, completely omitting the embedding field
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

	// Copy first N messages
	for count < g.cfg.DevMode.MaxMessages {
		var msg MessageEmbedding
		if err := decoder.Decode(&msg); err != nil {
			if err.Error() == "EOF" {
				break
			}
			return fmt.Errorf("failed to decode message: %w", err)
		}

		// Set embedding field to null for dev file
		msg.Embedding = nil

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