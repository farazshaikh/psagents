package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	// Create a temporary config file for testing
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "test_config.yaml")

	// Write test configuration
	testConfig := `
server:
  host: "localhost"
  port: 8080
  grpc_port: 50051

pipeline:
  batch_size: 100
  max_workers: 4
  timeout: "30s"

graphdb:
  type: "neo4j"
  host: "localhost"
  port: 7687
  username: "test"
  password: "test"

embeddings:
  model: "test-model"
  dimension: 1536
  cache_size: 1000
  similarity_threshold: 0.8

llm:
  provider: "test"
  model: "test-model"
  api_key: "test-key"
  max_tokens: 1000
  temperature: 0.7
  llm_threshold:
    min: 0.3
    max: 0.8

data:
  input_dir: "test/input"
  output_dir: "test/output"
  temp_dir: "test/temp"

logging:
  level: "debug"
  format: "json"
  output: "test.log"
`

	if err := os.WriteFile(configPath, []byte(testConfig), 0644); err != nil {
		t.Fatalf("Failed to write test config: %v", err)
	}

	// Load the configuration
	cfg, err := LoadConfig(configPath)
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	// Verify the loaded configuration
	if cfg.Server.Host != "localhost" {
		t.Errorf("Expected server host to be 'localhost', got '%s'", cfg.Server.Host)
	}
	if cfg.Server.Port != 8080 {
		t.Errorf("Expected server port to be 8080, got %d", cfg.Server.Port)
	}
	if cfg.Pipeline.BatchSize != 100 {
		t.Errorf("Expected batch size to be 100, got %d", cfg.Pipeline.BatchSize)
	}
	if cfg.Embeddings.SimilarityThreshold != 0.8 {
		t.Errorf("Expected similarity threshold to be 0.8, got %f", cfg.Embeddings.SimilarityThreshold)
	}
}

func TestLoadDefaultConfig(t *testing.T) {
	// Save current working directory
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create a temporary directory for testing
	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("Failed to change directory: %v", err)
	}

	// Create config directory
	configDir := filepath.Join(tmpDir, "config")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		t.Fatalf("Failed to create config directory: %v", err)
	}

	// Copy the example config
	exampleConfig := filepath.Join(originalDir, "config", "config.example.yaml")
	if err := os.Link(exampleConfig, filepath.Join(configDir, "config.example.yaml")); err != nil {
		t.Fatalf("Failed to link example config: %v", err)
	}

	// Try to load the default config
	cfg, err := LoadDefaultConfig()
	if err != nil {
		t.Fatalf("Failed to load default config: %v", err)
	}

	// Verify some basic configuration values
	if cfg.Server.Port == 0 {
		t.Error("Expected server port to be set")
	}
	if cfg.Pipeline.BatchSize == 0 {
		t.Error("Expected batch size to be set")
	}
} 