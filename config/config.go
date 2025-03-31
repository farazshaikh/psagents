package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

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
	Ingestion  IngestionConfig  `mapstructure:"ingestion"`
	Inference  InferenceConfig  `mapstructure:"inference"`
}

// InferenceConfig represents inference-related configuration
type InferenceConfig struct {
	MaxHops int `mapstructure:"max_hops"`
	MaxSimilarityAnchors int `mapstructure:"max_similarity_anchors"`
	MinConfidence float64 `mapstructure:"min_confidence"`
	MaxRelatedMessages int `mapstructure:"max_related_messages"`
	MaxRelatedDepth int `mapstructure:"max_related_depth"`
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
	SimilarityAnchors int `mapstructure:"similarity_anchors"`
	SemanticFrontier int `mapstructure:"semantic_frontier"`
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
	Provider         string                 `mapstructure:"provider"`
	Timeout          int                    `mapstructure:"timeout_seconds"`
	MaxTokens        int                    `mapstructure:"max_tokens"`
	Temperature      float64                `mapstructure:"temperature"`
	InferenceBatchSize int                  `mapstructure:"inference_batch_size"`
	LLMThreshold     ThresholdConfig        `mapstructure:"llm_threshold"`
	SystemPromptFile string                 `mapstructure:"system_prompt_file"`
	SystemPrompt     string                 `mapstructure:"-"` // Loaded from file
	InferenceSystemPromptFile string        `mapstructure:"inference_system_prompt_file"`
	InferenceSystemPrompt     string        `mapstructure:"-"` // Loaded from file
	EvaluationSystemPromptFile string        `mapstructure:"evaluation_system_prompt_file"`
	EvaluationSystemPrompt     string        `mapstructure:"-"` // Loaded from file
	Providers        map[string]ProviderConfig `mapstructure:"providers"`
}

// ProviderConfig represents configuration for a specific LLM provider
type ProviderConfig struct {
	Enabled   bool   `mapstructure:"enabled"`
	Endpoint  string `mapstructure:"endpoint"`
	Model     string `mapstructure:"model"`
	APIKey    string `mapstructure:"api_key"`
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

// IngestionConfig represents ingestion-related configuration
type IngestionConfig struct {
	Stages []map[string]interface{} `mapstructure:"stages"`
}

// LoadConfig reads and parses the configuration file
func LoadConfig(configPath string) (*Config, error) {
	// Create a new viper instance
	v := viper.New()

	// Set the config file path
	v.SetConfigFile(configPath)

	// Enable environment variable substitution and interpolation
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.SetEnvPrefix("")  // Remove prefix for direct env var names like OPENAI_API_KEY
	v.AutomaticEnv()
	v.AllowEmptyEnv(true)

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

	// Load system prompt from file if specified
	if config.LLM.SystemPromptFile != "" {
		// Get the directory of the config file
		configDir := filepath.Dir(configPath)
		// Resolve the system prompt file path relative to the config file
		promptPath := filepath.Join(configDir, "..", config.LLM.SystemPromptFile)
		// Read the system prompt file
		promptBytes, err := os.ReadFile(promptPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read system prompt file: %w", err)
		}
		config.LLM.SystemPrompt = string(promptBytes)
	}

	// Load inference system prompt from file if specified
	if config.LLM.InferenceSystemPromptFile != "" {
		// Get the directory of the config file
		configDir := filepath.Dir(configPath)
		// Resolve the inference system prompt file path relative to the config file
		promptPath := filepath.Join(configDir, "..", config.LLM.InferenceSystemPromptFile)
		// Read the inference system prompt file
		promptBytes, err := os.ReadFile(promptPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read inference system prompt file: %w", err)
		}
		config.LLM.InferenceSystemPrompt = string(promptBytes)
	}

	// Load evaluation system prompt from file if specified
	if config.LLM.EvaluationSystemPromptFile != "" {
		// Get the directory of the config file
		configDir := filepath.Dir(configPath)
		// Resolve the evaluation system prompt file path relative to the config file
		promptPath := filepath.Join(configDir, "..", config.LLM.EvaluationSystemPromptFile)
		// Read the evaluation system prompt file
		promptBytes, err := os.ReadFile(promptPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read evaluation system prompt file: %w", err)
		}
		config.LLM.EvaluationSystemPrompt = string(promptBytes)
	}

	// Handle environment variable substitution for API keys
	if openaiCfg, ok := config.LLM.Providers["openai"]; ok {
		// Try direct environment variable first
		if apiKey := os.Getenv("OPENAI_API_KEY"); apiKey != "" {
			openaiCfg.APIKey = apiKey
			config.LLM.Providers["openai"] = openaiCfg
		} else if strings.HasPrefix(openaiCfg.APIKey, "${") && strings.HasSuffix(openaiCfg.APIKey, "}") {
			// Try the variable name from config
			envVar := strings.TrimSuffix(strings.TrimPrefix(openaiCfg.APIKey, "${"), "}")
			if apiKey := os.Getenv(envVar); apiKey != "" {
				openaiCfg.APIKey = apiKey
				config.LLM.Providers["openai"] = openaiCfg
			}
		}

		// Ensure the endpoint is correct
		if openaiCfg.Endpoint == "" || !strings.HasSuffix(openaiCfg.Endpoint, "/v1/chat/completions") {
			openaiCfg.Endpoint = "https://api.openai.com/v1/chat/completions"
			config.LLM.Providers["openai"] = openaiCfg
		}

		// Validate model name
		if openaiCfg.Model == "" {
			openaiCfg.Model = "gpt-3.5-turbo" // Default to a commonly available model
			config.LLM.Providers["openai"] = openaiCfg
		}
	}

	if ollamaCfg, ok := config.LLM.Providers["ollama"]; ok {
		if strings.HasPrefix(ollamaCfg.APIKey, "${") && strings.HasSuffix(ollamaCfg.APIKey, "}") {
			envVar := strings.TrimSuffix(strings.TrimPrefix(ollamaCfg.APIKey, "${"), "}")
			if apiKey := os.Getenv(envVar); apiKey != "" {
				ollamaCfg.APIKey = apiKey
				config.LLM.Providers["ollama"] = ollamaCfg
			}
		}
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