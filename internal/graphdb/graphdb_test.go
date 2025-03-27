package graphdb

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/message"
	"github.com/yourusername/psagents/internal/vector"
)

// MockVectorDB implements a mock vector database for testing
type MockVectorDB struct {
	messages map[string]vector.Message
}

func NewMockVectorDB() *MockVectorDB {
	return &MockVectorDB{
		messages: make(map[string]vector.Message),
	}
}

func (m *MockVectorDB) Close() error {
	return nil
}

func (m *MockVectorDB) GetAllMessages() ([]vector.Message, error) {
	messages := make([]vector.Message, 0, len(m.messages))
	for _, msg := range m.messages {
		messages = append(messages, msg)
	}
	return messages, nil
}

func (m *MockVectorDB) Search(embedding []float32, limit int) ([]vector.Message, error) {
	// For testing, just return all messages up to the limit
	messages := make([]vector.Message, 0, limit)
	count := 0
	for _, msg := range m.messages {
		if count >= limit {
			break
		}
		messages = append(messages, msg)
		count++
	}
	return messages, nil
}

func TestGraphDB(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir := t.TempDir()

	// Create test configuration with test-specific values
	testCfg := &config.Config{
		GraphDB: config.GraphDBConfig{
			Type:              "neo4j",
			Host:             "localhost",
			Port:             7687,
			Username:         "neo4j",
			Password:         "testpassword",
			SimilarityAnchors: 2, // Use smaller values for testing
			SemanticFrontier:  2,
		},
		Qdrant: config.QdrantConfig{
			Enabled:        true,
			Path:          filepath.Join(tmpDir, "qdrant"),
			CollectionName: "test_embeddings",
			VectorSize:     384, // Use smaller vector size for testing
			Distance:       "Cosine",
			TestMode:       true,
		},
	}

	// Create mock vector database
	vectorDB := NewMockVectorDB()
	defer func() {
		vectorDB.Close()
		// Cleanup temporary directory
		os.RemoveAll(tmpDir)
	}()

	// Create test graph database
	graphDB, err := NewGraphDB(testCfg, vectorDB)
	if err != nil {
		t.Fatalf("Failed to create graph database: %v", err)
	}
	defer graphDB.Close()

	// Test GetLLMPrompt
	t.Run("GetLLMPrompt", func(t *testing.T) {
		sourceMsg := message.Message{
			ID:   "msg1",
			Text: "Hello, how are you?",
		}
		frontierMsgs := []message.Message{
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

		// Verify prompt content
		if !strings.Contains(prompt.Instructions, "Classify the relationships") {
			t.Error("Expected instructions to contain relationship classification guidance")
		}
		if !strings.Contains(prompt.Input, sourceMsg.Text) {
			t.Error("Expected input to contain source message text")
		}
		for _, msg := range frontierMsgs {
			if !strings.Contains(prompt.Input, msg.Text) {
				t.Error("Expected input to contain frontier message text")
			}
		}
	})

	// Test graph population
	t.Run("GraphPopulation", func(t *testing.T) {
		ctx := context.Background()

		// Add test messages to vector database
		testMessages := []struct {
			id        string
			text      string
			embedding []float32
		}{
			{"test1", "First test message", make([]float32, testCfg.Qdrant.VectorSize)},
			{"test2", "Second test message", make([]float32, testCfg.Qdrant.VectorSize)},
			{"test3", "Third test message", make([]float32, testCfg.Qdrant.VectorSize)},
		}

		for _, msg := range testMessages {
			vectorDB.messages[msg.id] = vector.Message{
				ID:        msg.id,
				Text:      msg.text,
				Embedding: msg.embedding,
			}
		}

		// Test FirstPass
		if err := graphDB.FirstPass(ctx); err != nil {
			t.Fatalf("Failed to execute first pass: %v", err)
		}

		// Test SecondPass
		if err := graphDB.SecondPass(ctx); err != nil {
			t.Fatalf("Failed to execute second pass: %v", err)
		}
	})
} 