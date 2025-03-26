# Configuration Package

This package provides functionality to load and parse configuration from YAML files.

## Features

- Load configuration from YAML files
- Environment variable support
- Type-safe configuration structs
- Default configuration loading
- Comprehensive test coverage

## Usage

### Loading Configuration

```go
import "github.com/yourusername/psagents/config"

// Load from a specific file
cfg, err := config.LoadConfig("path/to/config.yaml")
if err != nil {
    log.Fatal(err)
}

// Load default configuration
cfg, err := config.LoadDefaultConfig()
if err != nil {
    log.Fatal(err)
}
```

### Accessing Configuration

```go
// Server configuration
serverHost := cfg.Server.Host
serverPort := cfg.Server.Port

// Pipeline configuration
batchSize := cfg.Pipeline.BatchSize
maxWorkers := cfg.Pipeline.MaxWorkers

// GraphDB configuration
dbType := cfg.GraphDB.Type
dbHost := cfg.GraphDB.Host

// Embeddings configuration
model := cfg.Embeddings.Model
threshold := cfg.Embeddings.SimilarityThreshold

// LLM configuration
provider := cfg.LLM.Provider
apiKey := cfg.LLM.APIKey
```

## Configuration Structure

The configuration is organized into several sections:

- `server`: Server-related settings
- `pipeline`: Pipeline processing settings
- `graphdb`: Graph database connection settings
- `embeddings`: Embedding generation settings
- `llm`: LLM processing settings
- `data`: Data directory settings
- `logging`: Logging configuration

## Environment Variables

The configuration supports environment variables. Any configuration value can be overridden using environment variables following the pattern:

```
PSAGENTS_SERVER_HOST=localhost
PSAGENTS_SERVER_PORT=8080
PSAGENTS_LLM_API_KEY=your-api-key
```

## Testing

Run the tests:

```bash
go test ./config
```

## Example Configuration

See `config.example.yaml` for a complete example configuration file.