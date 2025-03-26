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
	testConfig := `# PS Agents Configuration

# Server Configuration
server:
  host: "0.0.0.0"
  port: 8080
  grpc_port: 50051

# Pipeline Configuration
pipeline:
  batch_size: 100
  max_workers: 4
  timeout: "30s"

# Graph Database Configuration
graphdb:
  type: "neo4j"  # or "janusgraph"
  host: "localhost"
  port: 7687
  username: "neo4j"
  password: "password"

# Embedding Configuration
embeddings:
  model: "text-embedding-ada-002"
  dimension: 1536
  cache_size: 10000
  similarity_threshold: 0.8

# LLM Configuration
llm:
  provider: "openai"
  model: "gpt-4"
  api_key: "${OPENAI_API_KEY}"
  max_tokens: 1000
  temperature: 0.7
  llm_threshold:
    min: 0.3
    max: 0.8

# Data Configuration
data:
  input_dir: "data/input"
  output_dir: "data/output"
  temp_dir: "data/temp"

# Logging Configuration
logging:
  level: "info"
  format: "json"
  output: "logs/app.log"
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
	if cfg.Server.Host != "0.0.0.0" {
		t.Errorf("Expected server host to be '0.0.0.0', got '%s'", cfg.Server.Host)
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
	if cfg.GraphDB.Type != "neo4j" {
		t.Errorf("Expected graphdb type to be 'neo4j', got '%s'", cfg.GraphDB.Type)
	}
	if cfg.LLM.Provider != "openai" {
		t.Errorf("Expected llm provider to be 'openai', got '%s'", cfg.LLM.Provider)
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

	// Read the example config content
	exampleConfig := filepath.Join(originalDir, "config.example.yaml")
	content, err := os.ReadFile(exampleConfig)
	if err != nil {
		t.Fatalf("Failed to read example config: %v", err)
	}

	// Write the example config to the test directory
	testConfigPath := filepath.Join(configDir, "config.example.yaml")
	if err := os.WriteFile(testConfigPath, content, 0644); err != nil {
		t.Fatalf("Failed to write test config: %v", err)
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
	if cfg.GraphDB.Type == "" {
		t.Error("Expected graphdb type to be set")
	}
	if cfg.LLM.Provider == "" {
		t.Error("Expected llm provider to be set")
	}
} 