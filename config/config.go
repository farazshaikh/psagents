package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config represents the main configuration structure
type Config struct {
	Server     ServerConfig     `mapstructure:"server"`
	Pipeline   PipelineConfig   `mapstructure:"pipeline"`
	GraphDB    GraphDBConfig    `mapstructure:"graphdb"`
	Embeddings EmbeddingsConfig `mapstructure:"embeddings"`
	LLM        LLMConfig        `mapstructure:"llm"`
	Data       DataConfig       `mapstructure:"data"`
	Logging    LoggingConfig    `mapstructure:"logging"`
	DevMode    DevModeConfig    `mapstructure:"devmode"`
	Qdrant     QdrantConfig     `mapstructure:"qdrant"`
}

// ServerConfig represents server-related configuration
type ServerConfig struct {
	Host      string `mapstructure:"host"`
	Port      int    `mapstructure:"port"`
	GRPCPort  int    `mapstructure:"grpc_port"`
}

// PipelineConfig represents pipeline-related configuration
type PipelineConfig struct {
	BatchSize  int    `mapstructure:"batch_size"`
	MaxWorkers int    `mapstructure:"max_workers"`
	Timeout    string `mapstructure:"timeout"`
}

// GraphDBConfig represents graph database configuration
type GraphDBConfig struct {
	Type     string `mapstructure:"type"`
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
}

// DevModeConfig represents development mode configuration
type DevModeConfig struct {
	Enabled    bool   `mapstructure:"enabled"`
	MaxMessages int    `mapstructure:"max_messages"`
}

// EmbeddingsConfig represents embedding-related configuration
type EmbeddingsConfig struct {
	Model              string  `mapstructure:"model"`
	Dimension          int     `mapstructure:"dimension"`
	CacheSize          int     `mapstructure:"cache_size"`
	SimilarityThreshold float64 `mapstructure:"similarity_threshold"`
	Endpoint           string  `mapstructure:"endpoint"`
	RequestFormat      string  `mapstructure:"request_format"`
}

// LLMConfig represents LLM-related configuration
type LLMConfig struct {
	Provider      string        `mapstructure:"provider"`
	Model         string        `mapstructure:"model"`
	APIKey        string        `mapstructure:"api_key"`
	Endpoint      string        `mapstructure:"endpoint"`
	Timeout       int           `mapstructure:"timeout_seconds"`
	MaxTokens     int           `mapstructure:"max_tokens"`
	Temperature   float64       `mapstructure:"temperature"`
	LLMThreshold  ThresholdConfig `mapstructure:"llm_threshold"`
}

// QdrantConfig represents Qdrant-related configuration
type QdrantConfig struct {
	Enabled             bool   `mapstructure:"enabled"`
	Path                string `mapstructure:"path"`
	CollectionName      string `mapstructure:"collection_name"`
	VectorSize          int    `mapstructure:"vector_size"`
	Distance            string `mapstructure:"distance"`
	OnDiskPayload       bool   `mapstructure:"on_disk_payload"`
	OptimizeForDiskAccess bool   `mapstructure:"optimize_for_disk_access"`
	TestMode            bool   `mapstructure:"test_mode"`
}

// ThresholdConfig represents threshold configuration
type ThresholdConfig struct {
	Min float64 `mapstructure:"min"`
	Max float64 `mapstructure:"max"`
}

// DataConfig represents data-related configuration
type DataConfig struct {
	InputDir  string `mapstructure:"input_dir"`
	OutputDir string `mapstructure:"output_dir"`
	TempDir   string `mapstructure:"temp_dir"`
}

// LoggingConfig represents logging-related configuration
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
	Output string `mapstructure:"output"`
}

// LoadConfig reads and parses the configuration file
func LoadConfig(configPath string) (*Config, error) {
	// Create a new viper instance
	v := viper.New()

	// Set the config file path
	v.SetConfigFile(configPath)

	// Read environment variables
	v.AutomaticEnv()

	// Read the config file
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Create a new config instance
	config := &Config{}

	// Unmarshal the config into our struct
	if err := v.Unmarshal(config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return config, nil
}

// LoadDefaultConfig loads the default configuration from config.example.yaml
func LoadDefaultConfig() (*Config, error) {
	// Get the current working directory
	workDir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get working directory: %w", err)
	}

	// Construct the path to config.example.yaml
	configPath := filepath.Join(workDir, "config", "config.example.yaml")

	// Load the configuration
	return LoadConfig(configPath)
}