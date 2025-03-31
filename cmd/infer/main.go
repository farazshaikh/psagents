package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/inference"
)

type BatchQuery struct {
	ID                   string  `json:"id"`
	Question            string  `json:"question"`
	Difficulty          string  `json:"difficulty"`
	ExampleCorrectAnswer string  `json:"exampleCorrectAnswer"`
	PsaAgentAnswer      string  `json:"psaAgentAnswer,omitempty"`
	PsaAgentConfidence  float64 `json:"psaAgentConfidence,omitempty"`
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

	// Initialize base inference params
	params := inference.InferenceParams{
		MaxSimilarityAnchors: cfg.Inference.MaxSimilarityAnchors,
		MaxRelatedMessages:   cfg.Inference.MaxRelatedMessages,
		MaxRelatedDepth:      cfg.Inference.MaxRelatedDepth,
		SystemPrompt:         cfg.LLM.InferenceSystemPrompt,
		SamplingStrategy:     inference.SamplingStrategy_Greedy,
		IncludeDirectMatches: true,
	}

	if *interactive {
		runInterActiveMode(cfg, params)
	} else if *batchFile != "" {
		runBatchMode(cfg, *batchFile, *difficulty, params)
	} else {
		fmt.Println("Please specify either -i for interactive mode or -f for batch mode")
		os.Exit(1)
	}
}

func runInterActiveMode(cfg *config.Config, params inference.InferenceParams) {
	engine, err := inference.NewEngine(cfg)
	if err != nil {
		fmt.Printf("Error initializing inference: %v\n", err)
		os.Exit(1)
	}
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("\nEnter your question (or 'quit' to exit): ")
		question, _ := reader.ReadString('\n')
		question = strings.TrimSpace(question)

		if question == "quit" {
			break
		}

		// Update only the question in params
		params.Query = inference.Query{
			Question: question,
		}

		response, err := engine.Infer(params)
		if err != nil {
			fmt.Printf("Error processing question: %v\n", err)
			continue
		}

		jsonResponse, err := json.MarshalIndent(response, "", "  ")
		if err != nil {
			fmt.Printf("Error marshaling response: %v\n", err)
			continue
		}
		fmt.Printf("\n Answer:\n%s\n", string(jsonResponse))
	}
}

func getNextEvaluationFile() (*os.File, error) {
	// Find the next available evaluation file number
	logsDir := "data/evaluations"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create evaluations directory: %w", err)
	}

	var evalFile *os.File
	for i := 0; i <= 999; i++ {
		filename := fmt.Sprintf("evaluation_%03d.jsonl", i)
		filepath := filepath.Join(logsDir, filename)
		if _, err := os.Stat(filepath); os.IsNotExist(err) {
			evalFile, err = os.Create(filepath)
			if err != nil {
				return nil, fmt.Errorf("failed to create evaluation file: %w", err)
			}
			break
		}
	}

	if evalFile == nil {
		return nil, fmt.Errorf("no available evaluation file names (reached limit of 999)")
	}

	return evalFile, nil
}

func writeEvaluation(file *os.File, result BatchQuery) error {
	// Create evaluation entry with the required schema
	evaluation := struct {
		Difficulty          string  `json:"difficulty"`
		Question           string  `json:"question"`
		ExampleCorrectAnswer string `json:"exampleCorrectAnswer"`
		PsaAgentAnswer      string  `json:"psaAgentAnswer"`
		PsaAgentConfidence  float64 `json:"psaAgentConfidence"`
	}{
		Difficulty:          result.Difficulty,
		Question:           result.Question,
		ExampleCorrectAnswer: result.ExampleCorrectAnswer,
		PsaAgentAnswer:      result.PsaAgentAnswer,
		PsaAgentConfidence:  result.PsaAgentConfidence,
	}

	// Marshal to JSON and write with newline
	if bytes, err := json.Marshal(evaluation); err != nil {
		return fmt.Errorf("failed to marshal evaluation: %w", err)
	} else if _, err := file.Write(bytes); err != nil {
		return fmt.Errorf("failed to write evaluation: %w", err)
	} else if _, err := file.WriteString("\n"); err != nil {
		return fmt.Errorf("failed to write newline: %w", err)
	}

	return nil
}

func runBatchMode(cfg *config.Config, batchFile, difficulty string, params inference.InferenceParams) {
	// Read queries from file
	queries, err := loadQueries(batchFile)
	if err != nil {
		fmt.Printf("Error loading queries: %v\n", err)
		os.Exit(1)
	}

	// Filter by difficulty if specified
	if difficulty != "" {
		var filtered []BatchQuery
		for _, q := range queries {
			if q.Difficulty == difficulty {
				filtered = append(filtered, q)
			}
		}
		queries = filtered
	}

	// Create evaluation file
	evalFile, err := getNextEvaluationFile()
	if err != nil {
		fmt.Printf("Error creating evaluation file: %v\n", err)
		os.Exit(1)
	}
	defer evalFile.Close()

	engine, err := inference.NewEngine(cfg)
	if err != nil {
		fmt.Printf("Error initializing inference: %v\n", err)
		os.Exit(1)
	}

	// Process each query and stream results
	for _, query := range queries {
		fmt.Printf("Processing query %s: %s\n", query.ID, query.Question)

		// Update only the question in params
		params.Query = inference.Query{
			Question: query.Question,
		}

		response, err := engine.Infer(params)
		if err != nil {
			fmt.Printf("Error processing query %s: %v\n", query.ID, err)
			continue
		}

		query.PsaAgentAnswer = response.Answer
		query.PsaAgentConfidence = response.Confidence

		// Write evaluation immediately
		if err := writeEvaluation(evalFile, query); err != nil {
			fmt.Printf("Error writing evaluation for query %s: %v\n", query.ID, err)
			continue
		}
	}
}

func loadQueries(filePath string) ([]BatchQuery, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var queries []BatchQuery
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		var query BatchQuery
		if err := json.Unmarshal(scanner.Bytes(), &query); err != nil {
			return nil, fmt.Errorf("failed to parse query: %w", err)
		}
		queries = append(queries, query)
	}

	return queries, scanner.Err()
}