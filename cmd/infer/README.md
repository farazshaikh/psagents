# Inference Command

The inference command is a tool for evaluating questions against a knowledge graph built from processed messages. It uses a combination of vector similarity search and graph traversal to find relevant information, then uses an LLM to generate answers based on the context.

## Features

- Interactive mode for real-time question answering
- Batch mode for processing multiple queries from a file
- Difficulty-based query filtering
- Configurable graph traversal depth and confidence thresholds
- Automatic evaluation logging

## Usage

### Interactive Mode

Run the command in interactive mode to ask questions directly:

```bash
./infer -i
```

This will start an interactive session where you can type questions and get immediate answers. Type 'quit' to exit.

### Batch Mode

Process a batch of queries from a JSONL file:

```bash
./infer -f data/queries.jsonl
```

Optionally filter by difficulty:

```bash
./infer -f data/queries.jsonl -d easy
```

Valid difficulty levels are:
- easy
- medium
- hard

### Query Format

Queries in the JSONL file should follow this format:

```json
{
  "id": "q123",
  "question": "What is the relationship between X and Y?",
  "difficulty": "medium"
}
```

### Output Format

Results are written to `data/evaluations.jsonl` in this format:

```json
{
  "id": "q123",
  "question": "What is the relationship between X and Y?",
  "difficulty": "medium",
  "answer": "Based on the available information...",
  "confidence": 0.85,
  "evaluation": "The answer correctly identifies..."
}
```

## Configuration

The inference command uses the following configuration settings in `config/config.yaml`:

```yaml
inference:
  max_hops: 3  # Maximum number of hops to traverse in the graph
  min_confidence: 0.7  # Minimum confidence score for relationships
  max_related_messages: 20  # Maximum number of related messages to include
  difficulty_levels:  # Mapping of difficulty levels to confidence thresholds
    easy: 0.8
    medium: 0.6
    hard: 0.4
```

## Dependencies

- Neo4j graph database
- OpenAI API for inference
- Ollama for local embeddings

## Implementation Details

1. For each query:
   - Convert the question to a vector representation using Ollama
   - Find the closest matching message in the vector database
   - Traverse the graph up to max_hops to find related messages
   - Filter relationships based on confidence thresholds
   - Generate a context-aware prompt for the LLM
   - Use OpenAI to generate and evaluate the answer
   - Save the results to the evaluations file

2. The graph traversal considers:
   - Direct semantic relationships
   - Relationship confidence scores
   - Path length to the source message
   - Relationship types and evidence

3. Answer generation uses:
   - The original question
   - The closest matching message
   - Related messages and their relationships
   - Path information showing how messages are connected