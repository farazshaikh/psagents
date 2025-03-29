package graphdb

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/llm"
	"github.com/yourusername/psagents/internal/message"
	"github.com/yourusername/psagents/internal/vector"
)

// Relationship represents a semantic relationship between two messages
// MUST match the output schema at data/prompts/outputschema.json
type Relationship struct {
	SourceID   string  `json:"source_id"`
	TargetID   string  `json:"target_id"`
	Relation   string  `json:"relation"`
	Confidence float64 `json:"confidence"`
	Evidence   string  `json:"evidence"`
}

// GraphDB handles graph database operations
type GraphDB struct {
	cfg          *config.Config
	driver       neo4j.Driver
	vectorDB     vector.DB
	inputSchema  string
	outputSchema string
}

// loadSchema loads a schema from a JSON file
func loadSchema(filePath string) (string, error) {
	fileBytes, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read schema file %s: %w", filePath, err)
	}

	// Verify it's valid JSON
	var parsed interface{}
	if err := json.Unmarshal(fileBytes, &parsed); err != nil {
		return "", fmt.Errorf("invalid JSON in file %s: %w", filePath, err)
	}

	// Format the JSON for consistent output
	formatted, err := json.MarshalIndent(parsed, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to format JSON from %s: %w", filePath, err)
	}

	return string(formatted), nil
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

	// Load schemas from prompt files
	inputSchema, err := loadSchema(filepath.Join("data", "prompts", "inputschema.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to load input schema: %w", err)
	}

	outputSchema, err := loadSchema(filepath.Join("data", "prompts", "outputschema.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to load output schema: %w", err)
	}

	return &GraphDB{
		cfg:          cfg,
		driver:       driver,
		vectorDB:     vectorDB,
		inputSchema:  inputSchema,
		outputSchema: outputSchema,
	}, nil
}

// Close closes the graph database connection
func (db *GraphDB) Close() error {
	return db.driver.Close()
}

// GetLLMPrompt generates the LLM prompt for relationship classification
func (db *GraphDB) GetLLMPrompt(sourceMsg message.Message, frontierMsgs []message.Message) (*message.LLMPrompt, error) {
	// Create batch input - must match the input schema at data/prompts/inputschema.json
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

	// Parse the schemas to avoid double-wrapping
	var inputSchemaObj, outputSchemaObj interface{}
	if err := json.Unmarshal([]byte(db.inputSchema), &inputSchemaObj); err != nil {
		return nil, fmt.Errorf("failed to parse input schema: %w", err)
	}
	if err := json.Unmarshal([]byte(db.outputSchema), &outputSchemaObj); err != nil {
		return nil, fmt.Errorf("failed to parse output schema: %w", err)
	}

	// Create a complete prompt as a JSON object
	prompt := struct {
		Instructions string      `json:"instructions"`
		InputSchema  interface{} `json:"input_schema"`
		Input        interface{} `json:"input"`
		OutputSchema interface{} `json:"output_schema"`
	}{
		Instructions: "Extract meaningful relationships between the source message and each frontier message.",
		InputSchema:  inputSchemaObj,
		Input:        input,
		OutputSchema: outputSchemaObj,
	}

	// Convert the entire prompt to JSON
	promptJSON, err := json.MarshalIndent(prompt, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal prompt to JSON: %w", err)
	}

	return &message.LLMPrompt{
		Instructions: string(promptJSON),
		InputSchema:  "",  // These are now included in the JSON
		Input:        "",  // These are now included in the JSON
		OutputSchema: "",  // These are now included in the JSON
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

// parseLLMResponse parses the LLM response into structured relationships
func (db *GraphDB) parseLLMResponse(llmResponse string) ([]Relationship, error) {
	// Clean the response to ensure it's valid JSON
	cleanedResponse := strings.TrimSpace(llmResponse)

	// Handle potential JSON array or single object formats
	if !strings.HasPrefix(cleanedResponse, "[") && strings.HasPrefix(cleanedResponse, "{") {
		cleanedResponse = "[" + cleanedResponse + "]"
	} else if !strings.HasPrefix(cleanedResponse, "[") {
		// Try to extract JSON from the response if it's embedded in text
		startIdx := strings.Index(cleanedResponse, "[")
		endIdx := strings.LastIndex(cleanedResponse, "]")
		if startIdx >= 0 && endIdx > startIdx {
			cleanedResponse = cleanedResponse[startIdx : endIdx+1]
		} else {
			// If we can't find array brackets, look for object brackets
			startIdx = strings.Index(cleanedResponse, "{")
			endIdx = strings.LastIndex(cleanedResponse, "}")
			if startIdx >= 0 && endIdx > startIdx {
				cleanedResponse = "[" + cleanedResponse[startIdx:endIdx+1] + "]"
			} else {
				return nil, fmt.Errorf("failed to parse LLM response: invalid JSON format")
			}
		}
	}

	// Parse the JSON response
	var relationships []Relationship
	if err := json.Unmarshal([]byte(cleanedResponse), &relationships); err != nil {
		fmt.Printf("Error parsing LLM response: %v\nResponse: %s\n", err, cleanedResponse)
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	fmt.Printf("Parsed %d relationships from LLM response\n", len(relationships))
	return relationships, nil
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

			//fmt.Printf("LLM Prompt: %s\n", llmPrompt.Instructions)

			llmResponse, err := llm.GetInference(llmPrompt.Instructions)
			if err != nil {
				return fmt.Errorf("failed to get LLM response: %w", err)
			}
			//fmt.Printf("LLM Response: %s\n", llmResponse)

			// Parse the LLM response
			relationships, err := db.parseLLMResponse(llmResponse)
			if err != nil {
				return fmt.Errorf("failed to parse LLM response: %w", err)
			}

			// Pretty print the relationships for debugging
			//prettyJSON, _ := json.MarshalIndent(relationships, "", "  ")
			//fmt.Printf("Relationships:\n%s\n", string(prettyJSON))


			// Create relationships in Neo4j
			_, err = session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
				for _, rel := range relationships {
					// Skip relationships with empty source or target IDs
					if rel.SourceID == "" || rel.TargetID == "" {
						fmt.Printf("Warning: Skipping relationship with empty ID - Source: '%s', Target: '%s', Relation: '%s'\n",
							rel.SourceID, rel.TargetID, rel.Relation)
						continue
					}

					// Check if both nodes exist in the graph before creating the relationship
					result, err := tx.Run(
						`MATCH (m:Message {id: $sourceId})
						 MATCH (n:Message {id: $targetId})
						 RETURN count(*) > 0 as exists`,
						map[string]interface{}{
							"sourceId": rel.SourceID,
							"targetId": rel.TargetID,
						},
					)
					if err != nil {
						return nil, err
					}

					exists := false
					if result.Next() {
						existsInterface, _ := result.Record().Get("exists")
						exists = existsInterface.(bool)
					}

					if !exists {
						fmt.Printf("Warning: Skipping relationship - one or both nodes not found in graph - Source: '%s', Target: '%s'\n",
							rel.SourceID, rel.TargetID)
						continue
					}

					// Log the relationship being created
					fmt.Printf("Creating relationship: Source: '%s', Target: '%s', Type: '%s', Confidence: %.2f\n",
						rel.SourceID, rel.TargetID, rel.Relation, rel.Confidence)
					// Create the relationship since both nodes exist
					_, err = tx.Run(
						`MATCH (m:Message {id: $sourceId})
						 MATCH (n:Message {id: $targetId})
						 MERGE (m)-[r:RELATED_TO {type: $relationType, confidence: $confidence, evidence: $evidence}]->(n)`,
						map[string]interface{}{
							"sourceId":     rel.SourceID,
							"targetId":     rel.TargetID,
							"relationType": rel.Relation,
							"confidence":   rel.Confidence,
							"evidence":     rel.Evidence,
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