package graphdb

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/llm"
	"github.com/yourusername/psagents/internal/message"
	"github.com/yourusername/psagents/internal/vector"
)

// GraphDB handles graph database operations
type GraphDB struct {
	cfg      *config.Config
	driver   neo4j.Driver
	vectorDB vector.DB
}

// NewGraphDB creates a new graph database connection
func NewGraphDB(cfg *config.Config, vectorDB vector.DB) (*GraphDB, error) {
	// Initialize Neo4j driver
	auth := neo4j.BasicAuth(cfg.GraphDB.Username, cfg.GraphDB.Password, "")
	driver, err := neo4j.NewDriver(
		fmt.Sprintf("neo4j://%s:%d", cfg.GraphDB.Host, cfg.GraphDB.Port),
		auth,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Neo4j driver: %w", err)
	}

	return &GraphDB{
		cfg:      cfg,
		driver:   driver,
		vectorDB: vectorDB,
	}, nil
}

// Close closes the graph database connection
func (db *GraphDB) Close() error {
	return db.driver.Close()
}

// GetLLMPrompt generates the LLM prompt for relationship classification
func (db *GraphDB) GetLLMPrompt(sourceMsg message.Message, frontierMsgs []message.Message) (*message.LLMPrompt, error) {
	// Create batch input
	input := message.BatchRelationshipInput{
		Batch: []struct {
			SourceMessage    message.Message   `json:"source_message"`
			FrontierMessages []message.Message `json:"frontier_messages"`
		}{
			{
				SourceMessage:    sourceMsg,
				FrontierMessages: frontierMsgs,
			},
		},
	}

	// Convert input to JSON
	inputJSON, err := json.MarshalIndent(input, "", "  ")
	if err != nil {
		return nil, err
	}

	return &message.LLMPrompt{
		Instructions: `Classify the relationships between the source message and each frontier message.
Consider the following relationship types:

1. Causal: Direct cause-effect relationship, one message leads to another
2. Follow-up: Continues or refines the inquiry/context
3. Contrast: Contradicts or changes stance
4. Elaboration: Expands on previous idea with more detail
5. Reframe/Correction: Rephrases or corrects previous message
6. Role Instruction: Sets behavior or persona
7. Scenario Setup: Sets up context or world
8. Topic Switch: Unrelated new context
9. Self-Reference: Reflects on own message
10. Meta-Prompting: Cross-prompt instructions
11. Identity Expression: Self-description or goals

For each relationship, provide:
- The relationship type
- Confidence score (0.0-1.0)
- Evidence supporting the classification`,
		InputSchema: `{
  "batch": [{
    "source_message": {
      "id": "string",
      "text": "string"
    },
    "frontier_messages": [{
      "id": "string",
      "text": "string"
    }]
  }]
}`,
		Input: string(inputJSON),
		OutputSchema: `{
  "results": [{
    "source_id": "string",
    "target_id": "string",
    "relation": "string",
    "confidence": "number",
    "evidence": "string"
  }]
}`,
	}, nil
}

// FirstPass performs the first pass of graph population:
// For each entry in vector database, find up to similarity_anchors count
// top K similar messages and connect them using isSimilar edge
func (db *GraphDB) FirstPass(ctx context.Context) error {
	session := db.driver.NewSession(neo4j.SessionConfig{})
	defer session.Close()

	// Create index for messages if it doesn't exist
	_, err := session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		_, err := tx.Run(
			"CREATE INDEX message_id IF NOT EXISTS FOR (m:Message) ON (m.id)",
			nil,
		)
		return nil, err
	})
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Get all messages from vector database
	messages, err := db.vectorDB.GetAllMessages()
	if err != nil {
		return fmt.Errorf("failed to get messages: %w", err)
	}

	fmt.Printf("Processing %d messages from vector database\n", len(messages))

	// Process each message
	for i, msg := range messages {
		// Find top K similar messages
		similar, err := db.vectorDB.Search(msg.Embedding, db.cfg.GraphDB.SimilarityAnchors)
		if err != nil {
			return fmt.Errorf("failed to search similar messages: %w", err)
		}

		fmt.Printf("Message %d/%d: Found %d similar messages for ID %s\n", i+1, len(messages), len(similar), msg.ID)

		// Create relationships in Neo4j
		_, err = session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
			// Create or merge source node
			_, err := tx.Run(
				"MERGE (m:Message {id: $id}) SET m.text = $text",
				map[string]interface{}{
					"id":   msg.ID,
					"text": msg.Text,
				},
			)
			if err != nil {
				return nil, err
			}

			// Create relationships to similar messages
			for _, sim := range similar {
				if sim.ID == msg.ID {
					continue // Skip self-relationships
				}

				// Create or merge source node and target node with text properties
				_, err := tx.Run(
					`MERGE (m:Message {id: $sourceId})
					 SET m.text = $sourceText
					 MERGE (n:Message {id: $targetId})
					 SET n.text = $targetText
					 MERGE (m)-[r:IS_SIMILAR {score: $score}]->(n)`,
					map[string]interface{}{
						"sourceId":   msg.ID,
						"sourceText": msg.Text,
						"targetId":   sim.ID,
						"targetText": sim.Text,
						"score":      sim.Score,
					},
				)
				if err != nil {
					return nil, err
				}
			}
			return nil, nil
		})
		if err != nil {
			return fmt.Errorf("failed to create relationships: %w", err)
		}
	}

	// Verify all nodes have text property
	_, err = session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		result, err := tx.Run(
			`MATCH (m:Message)
			 WHERE m.text IS NULL
			 RETURN count(m) as missing_text`,
			nil,
		)
		if err != nil {
			return nil, err
		}

		if result.Next() {
			missingText, _ := result.Record().Get("missing_text")
			if missingText.(int64) > 0 {
				fmt.Printf("Warning: Found %d nodes with missing text property\n", missingText)
			} else {
				fmt.Println("All nodes have text property set correctly")
			}
		}
		return nil, nil
	})
	if err != nil {
		return fmt.Errorf("failed to verify nodes: %w", err)
	}

	return nil
}

// SecondPass performs the second pass of graph population:
// For each message in the graph, get its similar connections,
// then for each connection get semantic_frontier count neighbors
// and do pairwise LLM classification
func (db *GraphDB) SecondPass(ctx context.Context, llm llm.LLM) error {
	session := db.driver.NewSession(neo4j.SessionConfig{})
	defer session.Close()

	// Get all messages with their similar connections
	result, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		result, err := tx.Run(
			`MATCH (m:Message)-[r:IS_SIMILAR]->(n:Message)
			 WITH m, n, r
			 ORDER BY r.score DESC
			 RETURN m.id, m.text, collect({id: n.id, text: n.text, score: r.score}) as similar`,
			nil,
		)
		if err != nil {
			return nil, err
		}

		var messages []struct {
			ID      string
			Text    string
			Similar []message.Message
		}

		for result.Next() {
			record := result.Record()
			id, _ := record.Get("m.id")
			text, _ := record.Get("m.text")
			similarInterface, _ := record.Get("similar")
			similar := make([]message.Message, 0)

			if similarArray, ok := similarInterface.([]interface{}); ok {
				for _, s := range similarArray {
					if simMap, ok := s.(map[string]interface{}); ok {
						similar = append(similar, message.Message{
							ID:    simMap["id"].(string),
							Text:  simMap["text"].(string),
							Score: float32(simMap["score"].(float64)),
						})
					}
				}
			}

			messages = append(messages, struct {
				ID      string
				Text    string
				Similar []message.Message
			}{
				ID:      id.(string),
				Text:    text.(string),
				Similar: similar,
			})
		}

		return messages, nil
	})

	if err != nil {
		return fmt.Errorf("failed to get messages: %w", err)
	}

	messages := result.([]struct {
		ID      string
		Text    string
		Similar []message.Message
	})

	// Process each message
	for _, msg := range messages {
		// For each similar message
		for _, sim := range msg.Similar {
			// Get semantic frontier neighbors
			frontier, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
				result, err := tx.Run(
					`MATCH (n:Message {id: $id})-[r:IS_SIMILAR]->(f:Message)
					 WHERE f.id <> $sourceId
					 RETURN f.id, f.text, r.score
					 ORDER BY r.score DESC
					 LIMIT $limit`,
					map[string]interface{}{
						"id":       sim.ID,
						"sourceId": msg.ID,
						"limit":    db.cfg.GraphDB.SemanticFrontier,
					},
				)
				if err != nil {
					return nil, err
				}

				var frontier []message.Message
				for result.Next() {
					record := result.Record()
					id, _ := record.Get("f.id")
					text, _ := record.Get("f.text")
					score, _ := record.Get("r.score")

					frontier = append(frontier, message.Message{
						ID:    id.(string),
						Text:  text.(string),
						Score: float32(score.(float64)),
					})
				}

				return frontier, nil
			})
			// Skip LLM query if frontier messages is empty
			if err != nil {
				return fmt.Errorf("failed to get frontier: %w", err)
			}

			frontierMsgs := frontier.([]message.Message)
			if len(frontierMsgs) == 0 {
				fmt.Printf("Skipping LLM query for message %s: no frontier messages found\n", msg.ID)
				continue
			}

			// Get LLM prompt for relationship classification
			llmPrompt, err := db.GetLLMPrompt(message.Message{ID: msg.ID, Text: msg.Text}, frontierMsgs)
			if err != nil {
				return fmt.Errorf("failed to generate LLM prompt: %w", err)
			}

			//fmt.Printf("LLM Prompt: %s\n", llmPrompt.Input)
			llmResponse, err := llm.GetInference(llmPrompt.Input)
			if err != nil {
				return fmt.Errorf("failed to get LLM response: %w", err)
			}
			fmt.Printf("LLM Response: %s\n", llmResponse)

			_ = llmPrompt // Use the prompt variable to avoid linter error

			// For now, we'll just create placeholder relationships
			_, err = session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
				for _, f := range frontierMsgs {
					_, err := tx.Run(
						`MERGE (m:Message {id: $sourceId})
						 SET m.text = $sourceText
						 MERGE (n:Message {id: $targetId})
						 SET n.text = $targetText
						 MERGE (m)-[r:RELATED_TO {type: "Placeholder", confidence: 0.5}]->(n)`,
						map[string]interface{}{
							"sourceId":   msg.ID,
							"sourceText": msg.Text,
							"targetId":   f.ID,
							"targetText": f.Text,
						},
					)
					if err != nil {
						return nil, err
					}
				}
				return nil, nil
			})
			if err != nil {
				return fmt.Errorf("failed to create relationships: %w", err)
			}
		}
	}

	return nil
}