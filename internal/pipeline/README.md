# Pipeline

Core data processing pipeline for text messages and graph construction.

## Components

- `processor.go`: Main pipeline processor
- `stages/`: Individual pipeline stages
  - `text.go`: Text preprocessing
  - `embedding.go`: Embedding generation
  - `graph.go`: Graph construction
  - `llm.go`: LLM processing
- `models/`: Data models and types

## Pipeline Stages

1. Text Preprocessing
   - Tokenization
   - Cleaning
   - Normalization

2. Embedding Generation
   - Text embedding
   - Semantic similarity calculation

3. Graph Construction
   - Node creation
   - Edge formation
   - Weight calculation

4. LLM Processing
   - Intent detection
   - NER extraction
   - Causal analysis 