# Retrieval

Information retrieval and user experience layer.

## Components

- `engine.go`: Main retrieval engine
- `rankers/`: Result ranking algorithms
- `filters/`: Result filtering
- `models/`: Retrieval models

## Features

- Semantic search
- Context-aware retrieval
- Result ranking
- Query expansion
- Relevance scoring

## Usage

```go
engine := retrieval.NewEngine(config)
results := engine.Search(query, context)
ranked := engine.Rank(results)
``` 