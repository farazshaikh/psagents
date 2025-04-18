package graphdb

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	logFile      *os.File  // Log file for the current run
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

	// Create logs directory if it doesn't exist
	logsDir := "data/logs/graphdb"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create logs directory: %w", err)
	}

	// Find the next available log file number
	var logFile *os.File
	for i := 0; i <= 9999; i++ {
		filename := fmt.Sprintf("llminference_%04d.log", i)
		filepath := filepath.Join(logsDir, filename)
		if _, err := os.Stat(filepath); os.IsNotExist(err) {
			logFile, err = os.Create(filepath)
			if err != nil {
				return nil, fmt.Errorf("failed to create log file: %w", err)
			}
			// Write initial header with config dump
			fmt.Fprintf(logFile, "=== LLM Inference Log ===\n")
			fmt.Fprintf(logFile, "Started at: %s\n\n", time.Now().Format(time.RFC3339))
			
			// Dump configuration
			fmt.Fprintf(logFile, "=== Configuration ===\n")
			fmt.Fprintf(logFile, "GraphDB Settings:\n")
			fmt.Fprintf(logFile, "  Host: %s\n", cfg.GraphDB.Host)
			fmt.Fprintf(logFile, "  Port: %d\n", cfg.GraphDB.Port)
			fmt.Fprintf(logFile, "  Username: %s\n", cfg.GraphDB.Username)
			fmt.Fprintf(logFile, "  SimilarityAnchors: %d\n", cfg.GraphDB.SimilarityAnchors)
			fmt.Fprintf(logFile, "  SemanticFrontier: %d\n", cfg.GraphDB.SemanticFrontier)
			
			fmt.Fprintf(logFile, "\nLLM Settings:\n")
			fmt.Fprintf(logFile, "  Provider: %s\n", cfg.LLM.Provider)
			fmt.Fprintf(logFile, "  InferenceBatchSize: %d\n", cfg.LLM.InferenceBatchSize)
			fmt.Fprintf(logFile, "  MaxTokens: %d\n", cfg.LLM.MaxTokens)
			fmt.Fprintf(logFile, "  Temperature: %.2f\n", cfg.LLM.Temperature)
			fmt.Fprintf(logFile, "\n")
			break
		}
	}

	if logFile == nil {
		return nil, fmt.Errorf("no available log file names (reached limit of 9999)")
	}

	return &GraphDB{
		cfg:          cfg,
		driver:       driver,
		vectorDB:     vectorDB,
		inputSchema:  inputSchema,
		outputSchema: outputSchema,
		logFile:      logFile,
	}, nil
}

// Close closes the graph database connection and log file
func (db *GraphDB) Close() error {
	if db.logFile != nil {
		fmt.Fprintf(db.logFile, "\nEnded at: %s\n", time.Now().Format(time.RFC3339))
		db.logFile.Close()
	}
	return db.driver.Close()
}

// GetSession returns a new Neo4j session
func (db *GraphDB) GetSession() neo4j.Session {
	return db.driver.NewSession(neo4j.SessionConfig{})
}

// GetLLMPrompt generates the LLM prompt for relationship classification
func (db *GraphDB) GetLLMPrompt(pairs []struct {
	SourceMessage    message.Message
	FrontierMessages []message.Message
}) (*message.LLMPrompt, error) {
	// Create batch input - must match the input schema at data/prompts/inputschema.json
	input := message.BatchRelationshipInput{
		Batch: make([]struct {
			SourceMessage    message.Message   `json:"source_message"`
			FrontierMessages []message.Message `json:"frontier_messages"`
		}, len(pairs)),
	}

	// Fill the batch with the provided pairs
	for i, pair := range pairs {
		input.Batch[i] = struct {
			SourceMessage    message.Message   `json:"source_message"`
			FrontierMessages []message.Message `json:"frontier_messages"`
		}{
			SourceMessage:    pair.SourceMessage,
			FrontierMessages: pair.FrontierMessages,
		}
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
		InputSchema  interface{} `json:"input_schema"`
		OutputSchema interface{} `json:"output_schema"`
		Input        interface{} `json:"input"`
	}{
		InputSchema:  inputSchemaObj,
		OutputSchema: outputSchemaObj,
		Input:        input,
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

	// Process messages in batches
	var batch []struct {
		SourceMessage    message.Message
		FrontierMessages []message.Message
	}
	batchSize := db.cfg.LLM.InferenceBatchSize

	for _, msg := range messages {
		// Get all frontier messages for this source message
		var allFrontierMsgs []message.Message

		// For each similar message, get its frontier
		for _, sim := range msg.Similar {
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
			if err != nil {
				return fmt.Errorf("failed to get frontier: %w", err)
			}

			frontierMsgs := frontier.([]message.Message)
			allFrontierMsgs = append(allFrontierMsgs, frontierMsgs...)
		}
		// Remove duplicate frontier messages by using a map
		seen := make(map[string]bool)
		uniqueFrontier := make([]message.Message, 0, len(allFrontierMsgs))
		for _, msg := range allFrontierMsgs {
			if !seen[msg.ID] {
				seen[msg.ID] = true
				uniqueFrontier = append(uniqueFrontier, msg)
			}
		}
		allFrontierMsgs = uniqueFrontier

		if len(allFrontierMsgs) == 0 {
			fmt.Printf("Skipping message %s: no frontier messages found\n", msg.ID)
			continue
		}

		// Add to batch
		batch = append(batch, struct {
			SourceMessage    message.Message
			FrontierMessages []message.Message
		}{
			SourceMessage:    message.Message{ID: msg.ID, Text: msg.Text},
			FrontierMessages: allFrontierMsgs,
		})

		// Process batch when it reaches the desired size
		if len(batch) >= batchSize {
			if err := db.processBatch(ctx, llm, session, batch); err != nil {
				return fmt.Errorf("failed to process batch: %w", err)
			}
			batch = nil // Clear the batch
		}
	}

	// Process any remaining messages in the final batch
	if len(batch) > 0 {
		if err := db.processBatch(ctx, llm, session, batch); err != nil {
			return fmt.Errorf("failed to process final batch: %w", err)
		}
	}

	return nil
}


// validateRelationshipsAgainstBatch checks if relationships match their batch entries
// some validation that the LLM is upto some good standard
func (db *GraphDB) validateRelationshipsAgainstBatch(relationships []Relationship, batch []struct {
	SourceMessage    message.Message
	FrontierMessages []message.Message
}) {
	for _, rel := range relationships {
		// Find the batch entry containing this source message
		var batchEntry *struct {
			SourceMessage    message.Message
			FrontierMessages []message.Message
		}
		for i := range batch {
			if batch[i].SourceMessage.ID == rel.SourceID {
				batchEntry = &batch[i]
				break
			}
		}

		if batchEntry == nil {
			fmt.Fprintf(db.logFile, "Warning: Relationship contains source message %s not found in current batch\n", rel.SourceID)
			continue
		}

		// Check if target is in the frontier messages for this source
		targetInFrontier := false
		for _, frontierMsg := range batchEntry.FrontierMessages {
			if frontierMsg.ID == rel.TargetID {
				targetInFrontier = true
				break
			}
		}

		if !targetInFrontier {
			fmt.Fprintf(db.logFile, "Warning: Relationship target %s not in frontier for source %s\n", 
				rel.TargetID, rel.SourceID)
		}
	}
}


// processBatch handles the LLM inference and relationship creation for a batch of messages
func (db *GraphDB) processBatch(ctx context.Context, llm llm.LLM, session neo4j.Session, batch []struct {
	SourceMessage    message.Message
	FrontierMessages []message.Message
}) error {
	// Get LLM prompt for the batch
	llmPrompt, err := db.GetLLMPrompt(batch)
	if err != nil {
		return fmt.Errorf("failed to generate LLM prompt: %w", err)
	}

	// Write prompt with timestamp and separator
	fmt.Fprintf(db.logFile, "\n=== Batch Processing at %s ===\n", time.Now().Format(time.RFC3339))
	fmt.Fprintf(db.logFile, "Batch Size: %d\n\n", len(batch))

	fmt.Fprintf(db.logFile, "=== Source Messages ===\n")
	for _, pair := range batch {
		fmt.Fprintf(db.logFile, "Source ID: %s\n", pair.SourceMessage.ID)
		fmt.Fprintf(db.logFile, "Source Text: %s\n", pair.SourceMessage.Text)
		fmt.Fprintf(db.logFile, "Frontier Count: %d\n\n", len(pair.FrontierMessages))
	}

	fmt.Fprintf(db.logFile, "=== LLM Prompt ===\n")
	fmt.Fprintf(db.logFile, "%s\n\n", llmPrompt.Instructions)

	// Get LLM inference
	llmResponse, err := llm.GetInference(llmPrompt.Instructions, db.cfg.LLM.SystemPrompt)
	if err != nil {
		fmt.Fprintf(db.logFile, "=== Error ===\n")
		fmt.Fprintf(db.logFile, "Failed to get LLM response: %v\n", err)
		return fmt.Errorf("failed to get LLM response: %w", err)
	}

	// Log the response
	fmt.Fprintf(db.logFile, "=== LLM Response ===\n")
	fmt.Fprintf(db.logFile, "%s\n\n", llmResponse)

	// Parse the LLM response
	relationships, err := db.parseLLMResponse(llmResponse)
	if err != nil {
		fmt.Fprintf(db.logFile, "=== Parse Error ===\n")
		fmt.Fprintf(db.logFile, "Failed to parse response: %v\n", err)
		return nil
	}

	// some validation on parsed relationships
	db.validateRelationshipsAgainstBatch(relationships, batch)

	fmt.Fprintf(db.logFile, "=== Parsed Relationships ===\n")
	for _, rel := range relationships {
		fmt.Fprintf(db.logFile, "Source: %s, Target: %s, Type: %s, Confidence: %.2f\n",
			rel.SourceID, rel.TargetID, rel.Relation, rel.Confidence)
	}

	// Create relationships in Neo4j
	_, err = session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		for _, rel := range relationships {
			// Skip relationships with empty source or target IDs
			if rel.SourceID == "" || rel.TargetID == "" {
				fmt.Fprintf(db.logFile, "Warning: Skipping relationship with empty ID - Source: '%s', Target: '%s'\n",
					rel.SourceID, rel.TargetID)
				continue
			}

			// Check if both nodes exist
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
				fmt.Fprintf(db.logFile, "Warning: Skipping relationship - nodes not found - Source: '%s', Target: '%s'\n",
					rel.SourceID, rel.TargetID)
				continue
			}

			// Log the relationship being created
			fmt.Fprintf(db.logFile, "Creating relationship: Source: '%s', Target: '%s', Type: '%s', Confidence: %.2f\n",
				rel.SourceID, rel.TargetID, rel.Relation, rel.Confidence)

			// Create the relationship
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
		fmt.Fprintf(db.logFile, "\n=== Database Error ===\n")
		fmt.Fprintf(db.logFile, "Failed to create relationships: %v\n", err)
	}

	fmt.Fprintf(db.logFile, "\n=== End of Batch ===\n")
	return err
}

// GetMessageByID retrieves a message from Neo4j by its ID
func (db *GraphDB) GetMessageByID(session neo4j.Session, id string) (*message.Message, error) {
	result, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		result, err := tx.Run(
			"MATCH (m:Message {id: $id}) RETURN m.id, m.text",
			map[string]interface{}{
				"id": id,
			},
		)
		if err != nil {
			return nil, fmt.Errorf("failed to execute query: %w", err)
		}

		if !result.Next() {
			return nil, nil
		}

		record := result.Record()
		id, _ := record.Get("m.id")
		text, _ := record.Get("m.text")

		return &message.Message{
			ID:   id.(string),
			Text: text.(string),
		}, nil
	})

	if err != nil {
		return nil, err
	}

	if result == nil {
		return nil, nil
	}

	return result.(*message.Message), nil
}
