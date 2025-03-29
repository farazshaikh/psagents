# LLM Package

This package provides an interface for interacting with Language Models (LLMs), currently supporting Ollama.

## Features

- Generic LLM interface for different providers
- Ollama integration with chat API
- Configurable timeout and model settings
- Comprehensive error handling and logging
- Test coverage with mock server

## Usage

### Basic Usage

```go
import (
    "github.com/yourusername/psagents/config"
    "github.com/yourusername/psagents/internal/llm"
)

// Load configuration
cfg, err := config.LoadConfig("config/config.yaml")
if err != nil {
    log.Fatal(err)
}

// Create LLM instance
model, err := llm.NewLLM(cfg)
if err != nil {
    log.Fatal(err)
}
defer model.Close()

// Get inference
response, err := model.GetInference("Your prompt here", "Your system prompt here")
if err != nil {
    log.Fatal(err)
}
fmt.Println(response)
```

### Configuration

In your `config.yaml`:

```yaml
llm:
  provider: "ollama"
  endpoint: "http://localhost:11434/api/chat"
  timeout_seconds: 30
  model: "gpt-4"
  max_tokens: 1000
  temperature: 0.7
  llm_threshold:
    min: 0.3
    max: 0.8
```

### Development Mode

When `devmode.enabled` is true in the configuration:
- Detailed debug logging is enabled
- Response times and token usage are logged
- Error messages include more details

## Testing

Run the tests:

```bash
go test ./internal/llm
```

The test suite includes:
- Basic functionality tests
- Error handling tests
- Mock server for API testing
- Configuration validation