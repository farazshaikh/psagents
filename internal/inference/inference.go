package inference

import (
	"encoding/json"
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
	Question string `json:"question"`
}

type Response struct {
	Answer string `json:"answer"`
	Confidence float64 `json:"confidence"`
	SupportingEvidence []struct {
		MessageID string `json:"message_id"`
		Relevance string `json:"relevance"`
	} `json:"supporting_evidence"`
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
func NewLogger(cfg *config.Config) (*Logger, error) {
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



type Engine struct {
	graphDB graphdb.GraphDB
	llmClient llm.LLM
	vectorDB vector.DB
	embeddingsGen *embeddings.Generator
	logger *Logger
	cfg *config.Config
}



func NewEngine(cfg *config.Config) (*Engine, error) {
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
	// Initialize LLM
	llmClient, err := llm.NewLLM(cfg)
	if err != nil {
		fmt.Printf("Error initializing LLM: %v\n", err)
		os.Exit(1)
	}

	// Create session logger
	logger, err := NewLogger(cfg)
	if err != nil {
		fmt.Printf("Error creating logger: %v\n", err)
		os.Exit(1)
	}

	embeddingsGen, err := embeddings.NewGenerator(cfg)
	if err != nil {
		fmt.Printf("Error creating embeddings generator: %v\n", err)
		os.Exit(1)
	}

	return &Engine {
		graphDB: *graphDB,
		llmClient: llmClient,
		vectorDB: vectorDB,
		logger: logger,
		embeddingsGen: embeddingsGen,
		cfg: cfg,
	}, nil
}

func findRelatedMessages(tx neo4j.Transaction, directMatch vector.Message, minConfidence float64, maxMessages int, maxDepth int) ([]RelatedMessage, error) {
	// findRelatedMessages finds messages related to the directMatch within maxDepth hops.
	// Note: Neo4j does not support parameterized relationship pattern lengths in MATCH clauses
	// (e.g., cannot use -[r*1..$maxDepth]-). Therefore, we need to construct the query string
	// dynamically using fmt.Sprintf. This is safe as maxDepth is an internal parameter,
	// not user input.
	query := fmt.Sprintf(`MATCH path = (m:Message {id: $id})-[r*1..%d]-(n:Message)
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
		LIMIT $limit`, maxDepth)

	result, err := tx.Run(
		query,
		map[string]interface{}{
			"id":            directMatch.ID,
			"minConfidence": minConfidence,
			"limit":         maxMessages,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("failed to execute Neo4j query: %w", err)
	}

	var related []RelatedMessage
	for result.Next() {
		record := result.Record()

		// Get and validate all required fields
		id, ok := record.Get("n.id")
		if !ok || id == nil {
			continue
		}
		idStr, ok := id.(string)
		if !ok {
			continue
		}

		text, ok := record.Get("n.text")
		if !ok || text == nil {
			continue
		}
		textStr, ok := text.(string)
		if !ok {
			continue
		}

		relationType, ok := record.Get("relation_type")
		if !ok || relationType == nil {
			continue
		}
		relationTypeStr, ok := relationType.(string)
		if !ok {
			continue
		}

		confidence, ok := record.Get("confidence")
		if !ok || confidence == nil {
			continue
		}
		confidenceFloat, ok := confidence.(float64)
		if !ok {
			continue
		}

		evidence, ok := record.Get("evidence")
		if !ok || evidence == nil {
			continue
		}
		evidenceStr, ok := evidence.(string)
		if !ok {
			continue
		}

		pathIds, ok := record.Get("path_ids")
		if !ok || pathIds == nil {
			continue
		}

		// Convert []interface{} to []string
		pathIdsInterface, ok := pathIds.([]interface{})
		if !ok {
			continue
		}
		pathIdsString := make([]string, len(pathIdsInterface))
		validPath := true
		for i, pathId := range pathIdsInterface {
			if pathId == nil {
				validPath = false
				break
			}
			pathIdStr, ok := pathId.(string)
			if !ok {
				validPath = false
				break
			}
			pathIdsString[i] = pathIdStr
		}
		if !validPath {
			continue
		}

		// Create RelatedMessage with validated values
		related = append(related, RelatedMessage{
			Message: message.Message{
				ID:   idStr,
				Text: textStr,
			},
			Relation: graphdb.Relationship{
				SourceID:   directMatch.ID,
				TargetID:   idStr,
				Relation:   relationTypeStr,
				Confidence: confidenceFloat,
				Evidence:   evidenceStr,
			},
			Path: pathIdsString,
		})
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("error while iterating results: %w", err)
	}

	return related, nil
}

type SamplingStrategy int

const (
	SamplingStrategy_Greedy SamplingStrategy = iota
	SamplingStrategy_Uniform
)

type InferenceParams struct {
	Query                Query
	MaxSimilarityAnchors int
	MaxRelatedMessages   int
	MaxRelatedDepth      int
	IncludeDirectMatches bool
	SystemPrompt         string
	SamplingStrategy     SamplingStrategy
}

func sampleRelatedMessages(bins [][]RelatedMessage, maxMessages int, strategy SamplingStrategy) []RelatedMessage {
	if len(bins) == 0 {
		return nil
	}

	var sampled []RelatedMessage

	switch strategy {
	case SamplingStrategy_Greedy:
		// Start with the first bin (most relevant)
		remaining := maxMessages
		for i := 0; i < len(bins) && remaining > 0; i++ {
			bin := bins[i]
			// Take as many messages as possible from current bin
			if remaining < len(bin) {
				sampled = append(sampled, bin[:remaining]...)
				remaining = 0
			} else {
				sampled = append(sampled, bin...)
				remaining -= len(bin)
			}
		}

	case SamplingStrategy_Uniform:
		// Calculate messages per bin
		if len(bins) > 0 {
			messagesPerBin := maxMessages / len(bins)
			extraMessages := maxMessages % len(bins)

			for i, bin := range bins {
				take := messagesPerBin
				if i < extraMessages {
					take++ // Distribute remainder evenly
				}
				if take > len(bin) {
					take = len(bin)
				}
				sampled = append(sampled, bin[:take]...)
			}
		}
	}

	return sampled
}

func (e *Engine) Infer(params InferenceParams) (Response, error) {
	// Create message for the question
	questionMsg := message.Message{
		Text: params.Query.Question,
	}

	// Generate embedding for the question
	embedding, err := e.embeddingsGen.GenerateEmbedding(questionMsg.Text)
	if err != nil {
		return Response{}, fmt.Errorf("failed to generate embedding: %w", err)
	}

	// Find closest message in the database
	similar, err := e.vectorDB.Search(embedding, params.MaxSimilarityAnchors)
	if err != nil {
		return Response{}, fmt.Errorf("failed to find closest message: %w", err)
	}
	if len(similar) == 0 {
		return Response{}, fmt.Errorf("no matching messages found")
	}

	// Find related messages for each similar match
	session := e.graphDB.GetSession()
	defer session.Close()

	// Initialize slice with correct size
	allRelatedMessages := make([][]RelatedMessage, len(similar))

	for i, directMatch := range similar {
		// Find related messages using Neo4j traversal
		relatedResult, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
			return findRelatedMessages(tx, directMatch, 0.0, params.MaxRelatedMessages, params.MaxRelatedDepth)
		})

		if err != nil {
			return Response{}, fmt.Errorf("failed to traverse graph for match %s: %w", directMatch.ID, err)
		}

		relatedMessages := relatedResult.([]RelatedMessage)
		allRelatedMessages[i] = relatedMessages
	}

	// Sample related messages based on sampling strategy
	sampledRelatedMessages := sampleRelatedMessages(allRelatedMessages, params.MaxRelatedMessages, params.SamplingStrategy)
	if len(sampledRelatedMessages) == 0 {
		return Response{}, fmt.Errorf("no related messages found for any similar matches")
	}

	// Load inference prompt template
	inferencePromptBytes, err := os.ReadFile("data/prompts/inference.json")
	if err != nil {
		return Response{}, fmt.Errorf("failed to read inference prompt: %w", err)
	}

	// Parse the template
	var inferencePrompt InferencePrompt
	if err := json.Unmarshal(inferencePromptBytes, &inferencePrompt); err != nil {
		return Response{}, fmt.Errorf("failed to parse inference prompt template: %w", err)
	}

	// Populate the input
	inferencePrompt.Input.Question = params.Query.Question

	if params.IncludeDirectMatches {
	inferencePrompt.Input.Context.DirectMatch = make([]struct {
		ID   string `json:"id"`
		Text string `json:"text"`
	}, len(similar))
	for i, match := range similar {
		inferencePrompt.Input.Context.DirectMatch[i].ID = match.ID
			inferencePrompt.Input.Context.DirectMatch[i].Text = match.Text
		}
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
	}, len(sampledRelatedMessages))

	for i, msg := range sampledRelatedMessages {
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
		return Response{}, fmt.Errorf("failed to marshal inference prompt: %w", err)
	}

	// Call LLM with both system prompt and inference prompt
	answer, err := e.llmClient.GetInference(string(promptBytes), params.SystemPrompt)
	if err != nil {
		return Response{}, fmt.Errorf("failed to get LLM inference: %w", err)
	}

	// Log inference details
	e.logger.LogInference(
		params.Query.Question,
		embedding,
		similar,
		sampledRelatedMessages,
		&inferencePrompt,
		params.SystemPrompt,
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

	var response Response
	if err := json.Unmarshal([]byte(cleanAnswer), &response); err != nil {
		return Response{}, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	return response, nil
}