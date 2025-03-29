package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/embeddings"
	"github.com/yourusername/psagents/internal/graphdb"
	"github.com/yourusername/psagents/internal/llm"
	"github.com/yourusername/psagents/internal/message"
	"github.com/yourusername/psagents/internal/vector"
	"github.com/yourusername/psagents/internal/vector_db"
)

type Query struct {
	ID         string  `json:"id"`
	Question   string  `json:"question"`
	Difficulty string  `json:"difficulty,omitempty"`
	Answer     string  `json:"answer,omitempty"`
	Evaluation string  `json:"evaluation,omitempty"`
	Confidence float64 `json:"confidence,omitempty"`
}

type RelatedMessage struct {
	Message   message.Message       `json:"message"`
	Relation  graphdb.Relationship  `json:"relation"`
	Path      []string             `json:"path"`
}

type InferenceContext struct {
	DirectMatch     message.Message   `json:"direct_match"`
	RelatedMessages []RelatedMessage  `json:"related_messages"`
}

type InferencePrompt struct {
	Instructions string                 `json:"instructions"`
	InputSchema  map[string]interface{} `json:"input_schema"`
	OutputSchema map[string]interface{} `json:"output_schema"`
	Input        struct {
		Question string `json:"question"`
		Context  struct {
			DirectMatch     []struct {
				ID   string `json:"id"`
				Text string `json:"text"`
			} `json:"direct_match"`
			RelatedMessages []struct {
				Message struct {
					ID   string `json:"id"`
					Text string `json:"text"`
				} `json:"message"`
				Relation struct {
					Type       string  `json:"type"`
					Confidence float64 `json:"confidence"`
					Evidence   string  `json:"evidence"`
				} `json:"relation"`
				Path []string `json:"path"`
			} `json:"related_messages"`
		} `json:"context"`
	} `json:"input"`
}

// Logger handles session-specific logging
type Logger struct {
	*log.Logger
	file *os.File
}

// NewLogger creates a new session logger
func NewLogger() (*Logger, error) {
	// Create logs directory if it doesn't exist
	logsDir := "data/logs/inference"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create logs directory: %w", err)
	}

	// Find the next available log file number
	var logFile *os.File
	for i := 0; i <= 9999; i++ {
		filename := fmt.Sprintf("userinference_%04d.log", i)
		filepath := filepath.Join(logsDir, filename)
		if _, err := os.Stat(filepath); os.IsNotExist(err) {
			logFile, err = os.Create(filepath)
			if err != nil {
				return nil, fmt.Errorf("failed to create log file: %w", err)
			}
			break
		}
	}

	if logFile == nil {
		return nil, fmt.Errorf("no available log file names (reached limit of 9999)")
	}

	logger := log.New(logFile, "", log.Ldate|log.Ltime)
	return &Logger{
		Logger: logger,
		file:   logFile,
	}, nil
}

// Close closes the log file
func (l *Logger) Close() error {
	return l.file.Close()
}

// LogInference logs inference details
func (l *Logger) LogInference(question string, embedding []float32, directMatches []vector.Message, relatedMsgs []RelatedMessage, prompt *InferencePrompt, systemPrompt string, llmResponse string) {
	l.Printf("=== Inference Request ===\n")
	l.Printf("Question: %s\n", question)
	l.Printf("\nEmbedding: %v\n", embedding)

	l.Printf("\n=== Direct Matches ===")
	for i, match := range directMatches {
		l.Printf("\n%d. Match:", i+1)
		l.Printf("\n   ID: %s", match.ID)
		l.Printf("\n   Text: %s", match.Text)
	}

	l.Printf("\n\n=== Related Messages ===")
	for i, msg := range relatedMsgs {
		l.Printf("\n%d. Message:", i+1)
		l.Printf("\n   ID: %s", msg.Message.ID)
		l.Printf("\n   Text: %s", msg.Message.Text)
		l.Printf("\n   Relation: %s", msg.Relation.Relation)
		l.Printf("\n   Confidence: %.2f", msg.Relation.Confidence)
		l.Printf("\n   Evidence: %s", msg.Relation.Evidence)
		l.Printf("\n   Path: %v", msg.Path)
	}

	l.Printf("\n\n=== System Prompt ===")
	l.Printf("\n%s", systemPrompt)

	l.Printf("\n\n=== LLM Prompt ===")
	l.Printf("\nInstructions:\n%s", prompt.Instructions)
	l.Printf("\nInput Schema:\n%s", prompt.InputSchema)
	l.Printf("\nOutput Schema:\n%s", prompt.OutputSchema)
	inputBytes, _ := json.MarshalIndent(prompt.Input, "", "  ")
	l.Printf("\nInput:\n%s", string(inputBytes))

	l.Printf("\n\n=== LLM Response ===")
	l.Printf("\n%s", llmResponse)

	l.Printf("\n\n===================\n\n")
}

func main() {
	// Parse command line flags
	interactive := flag.Bool("i", false, "Run in interactive mode")
	batchFile := flag.String("f", "", "Path to batch query file")
	difficulty := flag.String("d", "", "Filter queries by difficulty (easy, medium, hard)")
	configPath := flag.String("config", "config/config.example.yaml", "path to config file")
	flag.Parse()

	// Load configuration
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		os.Exit(1)
	}

	// Initialize vector database
	vectorDB, err := vector_db.NewQdrantDB(cfg)
	if err != nil {
		fmt.Printf("Error initializing vector DB: %v\n", err)
		os.Exit(1)
	}
	defer vectorDB.Close()

	// Initialize graph database
	graphDB, err := graphdb.NewGraphDB(cfg, vectorDB)
	if err != nil {
		fmt.Printf("Error initializing graph DB: %v\n", err)
		os.Exit(1)
	}
	defer graphDB.Close()

	// Initialize LLM
	llmClient, err := llm.NewLLM(cfg)
	if err != nil {
		fmt.Printf("Error initializing LLM: %v\n", err)
		os.Exit(1)
	}

	// Create session logger
	logger, err := NewLogger()
	if err != nil {
		fmt.Printf("Error creating logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Close()

	ctx := context.Background()

	if *interactive {
		runInteractiveMode(ctx, cfg, vectorDB, graphDB, llmClient, logger)
	} else if *batchFile != "" {
		runBatchMode(ctx, cfg, vectorDB, graphDB, llmClient, *batchFile, *difficulty, logger)
	} else {
		fmt.Println("Please specify either -i for interactive mode or -f for batch mode")
		os.Exit(1)
	}
}

func runInteractiveMode(ctx context.Context, cfg *config.Config, vectorDB vector.DB, graphDB *graphdb.GraphDB, llmClient llm.LLM, logger *Logger) {
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("\nEnter your question (or 'quit' to exit): ")
		question, _ := reader.ReadString('\n')
		question = strings.TrimSpace(question)

		if question == "quit" {
			break
		}

		answer, confidence, err := processQuery(ctx, cfg, vectorDB, graphDB, llmClient, Query{Question: question}, logger)
		if err != nil {
			fmt.Printf("Error processing question: %v\n", err)
			continue
		}

		fmt.Printf("\nAnswer (confidence: %.2f):\n%s\n", confidence, answer)
	}
}

func runBatchMode(ctx context.Context, cfg *config.Config, vectorDB vector.DB, graphDB *graphdb.GraphDB, llmClient llm.LLM, batchFile, difficulty string, logger *Logger) {
	// Read queries from file
	queries, err := loadQueries(batchFile)
	if err != nil {
		fmt.Printf("Error loading queries: %v\n", err)
		os.Exit(1)
	}

	// Filter by difficulty if specified
	if difficulty != "" {
		var filtered []Query
		for _, q := range queries {
			if q.Difficulty == difficulty {
				filtered = append(filtered, q)
			}
		}
		queries = filtered
	}

	// Process each query
	results := make([]Query, 0, len(queries))
	for _, query := range queries {
		fmt.Printf("Processing query %s: %s\n", query.ID, query.Question)

		answer, confidence, err := processQuery(ctx, cfg, vectorDB, graphDB, llmClient, query, logger)
		if err != nil {
			fmt.Printf("Error processing query %s: %v\n", query.ID, err)
			continue
		}

		query.Answer = answer
		query.Confidence = confidence
		results = append(results, query)
	}

	// Write results to evaluations file
	if err := saveEvaluations(results); err != nil {
		fmt.Printf("Error saving evaluations: %v\n", err)
		os.Exit(1)
	}
}

func findRelatedMessages(tx neo4j.Transaction, directMatch vector.Message, minConfidence float64, limit int) ([]RelatedMessage, error) {
	result, err := tx.Run(
		`MATCH path = (m:Message {id: $id})-[r*1..3]-(n:Message)
		 WHERE ALL(rel in r WHERE rel.confidence >= $minConfidence)
			   AND n.id <> $id
		 WITH path, n,
			  LAST(relationships(path)) as last_rel,
			  [rel in relationships(path) |
				CASE type(rel)
					WHEN 'RELATED_TO' THEN rel.type
					ELSE type(rel)
				END
			  ] as rel_types,
			  [rel in relationships(path) | rel.confidence] as confidences,
			  [rel in relationships(path) | rel.evidence] as evidences
		 WITH path, n,
			  LAST(rel_types) as relation_type,
			  REDUCE(acc = 1.0, x IN confidences | acc * x) as confidence,
			  LAST(evidences) as evidence,
			  [node in nodes(path) | node.id] as path_ids
		 RETURN n.id, n.text,
				relation_type,
				confidence,
				evidence,
				path_ids
		 ORDER BY confidence DESC
		 LIMIT $limit`,
		map[string]interface{}{
			"id":            directMatch.ID,
			"minConfidence": minConfidence,
			"limit":         limit,
		},
	)

	if err != nil {
		return nil, err
	}

	var related []RelatedMessage
	for result.Next() {
		record := result.Record()
		id, _ := record.Get("n.id")
		text, _ := record.Get("n.text")
		relationType, _ := record.Get("relation_type")
		confidence, _ := record.Get("confidence")
		evidence, _ := record.Get("evidence")
		pathIds, _ := record.Get("path_ids")

		// Convert []interface{} to []string
		pathIdsInterface := pathIds.([]interface{})
		pathIdsString := make([]string, len(pathIdsInterface))
		for i, id := range pathIdsInterface {
			pathIdsString[i] = id.(string)
		}

		related = append(related, RelatedMessage{
			Message: message.Message{
				ID:   id.(string),
				Text: text.(string),
			},
			Relation: graphdb.Relationship{
				SourceID:   directMatch.ID,
				TargetID:   id.(string),
				Relation:   relationType.(string),
				Confidence: confidence.(float64),
				Evidence:   evidence.(string),
			},
			Path: pathIdsString,
		})
	}

	return related, nil
}

func processQuery(ctx context.Context, cfg *config.Config, vectorDB vector.DB, graphDB *graphdb.GraphDB, llmClient llm.LLM, query Query, logger *Logger) (string, float64, error) {
	// Create message for the question
	questionMsg := message.Message{
		ID:   fmt.Sprintf("q_%s", query.ID),
		Text: query.Question,
	}

	// Initialize embeddings generator
	embeddingsGen, err := embeddings.NewGenerator(cfg)
	if err != nil {
		return "", 0, fmt.Errorf("failed to create embeddings generator: %w", err)
	}

	// Generate embedding for the question
	embedding, err := embeddingsGen.GenerateEmbedding(questionMsg.Text)
	if err != nil {
		return "", 0, fmt.Errorf("failed to generate embedding: %w", err)
	}

	// Find closest message in the database
	similar, err := vectorDB.Search(embedding, cfg.Inference.MaxSimilarityAnchors)
	if err != nil {
		return "", 0, fmt.Errorf("failed to find closest message: %w", err)
	}
	if len(similar) == 0 {
		return "", 0, fmt.Errorf("no matching messages found")
	}

	// Initialize pairs with all similar messages
	pairs := make([]struct {
		SourceMessage    message.Message
		FrontierMessages []message.Message
	}, len(similar))

	// Find related messages for each similar match
	session := graphDB.GetSession()
	defer session.Close()

	var allRelatedMessages []RelatedMessage

	for i, directMatch := range similar {
		// Find related messages using Neo4j traversal
		relatedResult, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
			return findRelatedMessages(tx, directMatch, 0.0, cfg.GraphDB.SemanticFrontier)
		})

		if err != nil {
			return "", 0, fmt.Errorf("failed to traverse graph for match %s: %w", directMatch.ID, err)
		}

		relatedMessages := relatedResult.([]RelatedMessage)
		allRelatedMessages = append(allRelatedMessages, relatedMessages...)

		// Initialize pair for this similar match
		pairs[i] = struct {
			SourceMessage    message.Message
			FrontierMessages []message.Message
		}{
			SourceMessage: message.Message{
				ID:   directMatch.ID,
				Text: directMatch.Text,
			},
			FrontierMessages: make([]message.Message, len(relatedMessages)),
		}

		// Convert related messages to frontier messages
		for j, msg := range relatedMessages {
			pairs[i].FrontierMessages[j] = message.Message{
				ID:   msg.Message.ID,
				Text: msg.Message.Text,
			}
		}
	}

	if len(allRelatedMessages) == 0 {
		return "", 0, fmt.Errorf("no related messages found for any similar matches")
	}

	// Load inference prompt template
	inferencePromptBytes, err := os.ReadFile("data/prompts/inference.json")
	if err != nil {
		return "", 0, fmt.Errorf("failed to read inference prompt: %w", err)
	}

	// Parse the template
	var inferencePrompt InferencePrompt
	if err := json.Unmarshal(inferencePromptBytes, &inferencePrompt); err != nil {
		return "", 0, fmt.Errorf("failed to parse inference prompt template: %w", err)
	}

	// Populate the input
	inferencePrompt.Input.Question = query.Question
	inferencePrompt.Input.Context.DirectMatch = make([]struct {
		ID   string `json:"id"`
		Text string `json:"text"`
	}, len(similar))
	for i, match := range similar {
		inferencePrompt.Input.Context.DirectMatch[i].ID = match.ID
		inferencePrompt.Input.Context.DirectMatch[i].Text = match.Text
	}

	inferencePrompt.Input.Context.RelatedMessages = make([]struct {
		Message struct {
			ID   string `json:"id"`
			Text string `json:"text"`
		} `json:"message"`
		Relation struct {
			Type       string  `json:"type"`
			Confidence float64 `json:"confidence"`
			Evidence   string  `json:"evidence"`
		} `json:"relation"`
		Path []string `json:"path"`
	}, len(allRelatedMessages))
	for i, msg := range allRelatedMessages {
		inferencePrompt.Input.Context.RelatedMessages[i].Message.ID = msg.Message.ID
		inferencePrompt.Input.Context.RelatedMessages[i].Message.Text = msg.Message.Text
		inferencePrompt.Input.Context.RelatedMessages[i].Relation.Type = msg.Relation.Relation
		inferencePrompt.Input.Context.RelatedMessages[i].Relation.Confidence = msg.Relation.Confidence
		inferencePrompt.Input.Context.RelatedMessages[i].Relation.Evidence = msg.Relation.Evidence
		inferencePrompt.Input.Context.RelatedMessages[i].Path = msg.Path
	}

	// Convert prompt to JSON
	promptBytes, err := json.Marshal(inferencePrompt)
	if err != nil {
		return "", 0, fmt.Errorf("failed to marshal inference prompt: %w", err)
	}

	// Call LLM with both system prompt and inference prompt
	answer, err := llmClient.GetInference(string(promptBytes), cfg.LLM.InferenceSystemPrompt)
	if err != nil {
		return "", 0, fmt.Errorf("failed to get LLM inference: %w", err)
	}

	// Log inference details
	logger.LogInference(
		query.Question,
		embedding,
		similar,
		allRelatedMessages,
		&inferencePrompt,
		cfg.LLM.InferenceSystemPrompt,
		answer,
	)

	// Clean the response by removing markdown code fence blocks
	cleanAnswer := answer
	if strings.Contains(answer, "```") {
		// Split by code fence markers and take the content
		parts := strings.Split(answer, "```")
		if len(parts) >= 3 {
			// If format is ```json\n{...}\n```, take the middle part
			cleanAnswer = strings.TrimSpace(parts[1])
			// Remove the "json" or other language identifier if present
			if strings.Contains(cleanAnswer, "\n") {
				cleanAnswer = cleanAnswer[strings.Index(cleanAnswer, "\n")+1:]
			}
		}
	}

	// Parse the response
	var response struct {
		Answer     string  `json:"answer"`
		Confidence float64 `json:"confidence"`
	}
	if err := json.Unmarshal([]byte(cleanAnswer), &response); err != nil {
		return "", 0, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	return response.Answer, response.Confidence, nil
}

func loadQueries(filePath string) ([]Query, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var queries []Query
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		var query Query
		if err := json.Unmarshal(scanner.Bytes(), &query); err != nil {
			return nil, fmt.Errorf("failed to parse query: %w", err)
		}
		queries = append(queries, query)
	}

	return queries, scanner.Err()
}

func saveEvaluations(results []Query) error {
	file, err := os.Create(filepath.Join("data", "evaluations.jsonl"))
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")

	for _, result := range results {
		if err := encoder.Encode(result); err != nil {
			return fmt.Errorf("failed to encode result: %w", err)
		}
	}

	return nil
}