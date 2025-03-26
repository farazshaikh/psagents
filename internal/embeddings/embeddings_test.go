package embeddings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/yourusername/psagents/config"
)

func TestGenerateEmbeddings(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir := t.TempDir()

	// Create test configuration
	testCfg := &config.Config{
		Data: config.DataConfig{
			InputDir:  filepath.Join(tmpDir, "input"),
			OutputDir: filepath.Join(tmpDir, "output"),
			TempDir:   filepath.Join(tmpDir, "temp"),
		},
		Logging: config.LoggingConfig{
			Level:  "debug",
			Format: "text",
			Output: filepath.Join(tmpDir, "test.log"),
		},
		Embeddings: config.EmbeddingsConfig{
			Model:              "test-model",
			Dimension:         1536,
			CacheSize:         1000,
			SimilarityThreshold: 0.8,
		},
	}

	// Create input directory and add a test message
	if err := os.MkdirAll(testCfg.Data.InputDir, 0755); err != nil {
		t.Fatalf("Failed to create input directory: %v", err)
	}

	// Create generator
	gen, err := NewGenerator(testCfg)
	if err != nil {
		t.Fatalf("Failed to create generator: %v", err)
	}

	// Generate embeddings
	if err := gen.GenerateEmbeddings(); err != nil {
		t.Fatalf("Failed to generate embeddings: %v", err)
	}

	// Verify output file exists
	outputPath := filepath.Join(testCfg.Data.OutputDir, "messages_embeddings.jsonl")
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		t.Fatal("Output file was not created")
	}

	// Read and verify the output file
	file, err := os.Open(outputPath)
	if err != nil {
		t.Fatalf("Failed to open output file: %v", err)
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	var embedding MessageEmbedding
	if err := decoder.Decode(&embedding); err != nil {
		t.Fatalf("Failed to decode embedding: %v", err)
	}

	// Verify embedding structure
	if embedding.Text == "" {
		t.Error("Expected non-empty text")
	}
	if len(embedding.Embedding) != testCfg.Embeddings.Dimension {
		t.Errorf("Expected embedding dimension %d, got %d",
			testCfg.Embeddings.Dimension, len(embedding.Embedding))
	}
}