package graphdb

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/vector_db"
)

func TestGraphDB(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir := t.TempDir()

	// Create test configuration
	testCfg := &config.Config{
		GraphDB: config.GraphDBConfig{
			Type:              "neo4j",
			Host:             "localhost",
			Port:             7687,
			Username:         "neo4j",
			Password:         "password",
			SimilarityAnchors: 5,
			SemanticFrontier:  3,
		},
		Qdrant: config.QdrantConfig{
			Enabled:        true,
			Path:          filepath.Join(tmpDir, "qdrant"),
			CollectionName: "test_embeddings",
			VectorSize:     1024,
			Distance:       "Cosine",
			TestMode:       true,
		},
	}

	// Create test vector database
	vectorDB, err := vector_db.NewQdrantDB(testCfg)
	if err != nil {
		t.Fatalf("Failed to create vector database: %v", err)
	}
	defer vectorDB.Close()

	// Create test graph database
	graphDB, err := NewGraphDB(testCfg, vectorDB)
	if err != nil {
		t.Fatalf("Failed to create graph database: %v", err)
	}
	defer graphDB.Close()

	// Test GetLLMPrompt
	sourceMsg := Message{
		ID:   "msg1",
		Text: "Hello, how are you?",
	}
	frontierMsgs := []Message{
		{
			ID:   "msg2",
			Text: "I'm doing well, thanks!",
		},
		{
			ID:   "msg3",
			Text: "Let's discuss the project.",
		},
	}

	prompt, err := graphDB.GetLLMPrompt(sourceMsg, frontierMsgs)
	if err != nil {
		t.Fatalf("Failed to get LLM prompt: %v", err)
	}

	// Verify prompt structure
	if prompt.Instructions == "" {
		t.Error("Expected non-empty instructions")
	}
	if prompt.InputSchema == "" {
		t.Error("Expected non-empty input schema")
	}
	if prompt.OutputSchema == "" {
		t.Error("Expected non-empty output schema")
	}
	if prompt.Input == "" {
		t.Error("Expected non-empty input")
	}

	// Test FirstPass
	ctx := context.Background()
	if err := graphDB.FirstPass(ctx); err != nil {
		t.Fatalf("Failed to execute first pass: %v", err)
	}

	// Test SecondPass
	if err := graphDB.SecondPass(ctx); err != nil {
		t.Fatalf("Failed to execute second pass: %v", err)
	}
} 