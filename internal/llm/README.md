# LLM Processing

LLM-based processing for graph enhancement and analysis.

## Components

- `client.go`: LLM client interface
- `processors/`: LLM processing tasks
  - `intent.go`: Intent detection
  - `ner.go`: Named entity recognition
  - `causal.go`: Causal analysis
- `models/`: LLM models and types

## Features

- Intent detection
- Named entity recognition
- Causal analysis
- Synthetic node generation
- Edge relationship inference

## Usage

```go
client := llm.NewClient(config)
intent := client.DetectIntent(text)
entities := client.ExtractEntities(text)
causal := client.AnalyzeCausality(text)
``` 