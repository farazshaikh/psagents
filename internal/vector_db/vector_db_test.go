package vector_db

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/yourusername/psagents/config"
)

func TestQdrantDB(t *testing.T) {
	// Create temporary directories
	tmpDir := t.TempDir()
	qdrantDir := filepath.Join(tmpDir, "qdrant")
	outputDir := filepath.Join(tmpDir, "output")

	// Create test configuration
	cfg := &config.Config{
		Qdrant: config.QdrantConfig{
			Enabled:        true,
			Path:          qdrantDir,
			CollectionName: "test_embeddings",
			VectorSize:     768,
			Distance:      "Cosine",
			OnDiskPayload: true,
			TestMode:      true,
		},
		Data: config.DataConfig{
			OutputDir: outputDir,
		},
		Logging: config.LoggingConfig{
			Level:  "debug",
			Format: "text",
		},
	}

	// Create output directory and sample embeddings file
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Create test embeddings file
	embeddings := []MessageEmbedding{
		{
			ID:        "test1",
			Text:      "Test message 1",
			Embedding: make([]float32, 768),
		},
		{
			ID:        "test2",
			Text:      "Test message 2",
			Embedding: make([]float32, 768),
		},
	}

	file, err := os.Create(filepath.Join(outputDir, "messages_embeddings.jsonl"))
	if err != nil {
		t.Fatalf("Failed to create test embeddings file: %v", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	for _, emb := range embeddings {
		if err := encoder.Encode(emb); err != nil {
			t.Fatalf("Failed to write test embedding: %v", err)
		}
	}

	// Create QdrantDB instance
	db, err := NewQdrantDB(cfg)
	if err != nil {
		t.Fatalf("Failed to create QdrantDB: %v", err)
	}
	defer db.Close()

	// Create collection
	if err := db.CreateCollection(); err != nil {
		t.Fatalf("Failed to create collection: %v", err)
	}

	// Inject messages
	if err := db.InjectMessages(); err != nil {
		t.Fatalf("Failed to inject messages: %v", err)
	}

	// Verify test database file exists and contains the points
	testDBPath := filepath.Join(qdrantDir, "test.jsonl")
	if _, err := os.Stat(testDBPath); os.IsNotExist(err) {
		t.Fatal("Test database file was not created")
	}

	// Read and verify the test database file
	testFile, err := os.Open(testDBPath)
	if err != nil {
		t.Fatalf("Failed to open test database file: %v", err)
	}
	defer testFile.Close()

	decoder := json.NewDecoder(testFile)
	var points []*TestPoint
	for decoder.More() {
		var point TestPoint
		if err := decoder.Decode(&point); err != nil {
			t.Fatalf("Failed to decode point: %v", err)
		}
		points = append(points, &point)
	}

	if len(points) != len(embeddings) {
		t.Errorf("Expected %d points in test database, got %d", len(embeddings), len(points))
	}

	// Verify point contents
	for i, point := range points {
		if point.ID != embeddings[i].ID {
			t.Errorf("Point %d: expected ID %s, got %s", i, embeddings[i].ID, point.ID)
		}
		if point.Payload["text"] != embeddings[i].Text {
			t.Errorf("Point %d: expected text %s, got %s", i, embeddings[i].Text, point.Payload["text"])
		}
		if len(point.Vectors) != len(embeddings[i].Embedding) {
			t.Errorf("Point %d: expected vector length %d, got %d", i, len(embeddings[i].Embedding), len(point.Vectors))
		}
	}
}