package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
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

var (
	configPath string
	batchFile  string
	difficulty string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "infer",
		Short: "PSAgents inference tool",
		Long: `A command line tool for running inference queries against the PSAgents knowledge graph.
It supports both interactive and batch modes for processing questions.`,
	}

	// Interactive mode command
	interactiveCmd := &cobra.Command{
		Use:   "interactive",
		Short: "Run in interactive mode",
		Long:  `Start an interactive session where you can type questions and get immediate answers.`,
		Run: func(cmd *cobra.Command, args []string) {
			cfg, err := config.LoadConfig(configPath)
			if err != nil {
				fmt.Printf("Error loading config: %v\n", err)
				os.Exit(1)
			}
			params := inference.GetInferenceParams(cfg, inference.SemanticOnly)
			runInterActiveMode(cfg, params)
		},
	}

	// Batch mode command
	batchCmd := &cobra.Command{
		Use:   "batch",
		Short: "Run in batch mode",
		Long:  `Process multiple queries from a JSONL file.`,
		Run: func(cmd *cobra.Command, args []string) {
			if batchFile == "" {
				fmt.Println("Error: batch file path is required")
				os.Exit(1)
			}

			cfg, err := config.LoadConfig(configPath)
			if err != nil {
				fmt.Printf("Error loading config: %v\n", err)
				os.Exit(1)
			}
			params := inference.GetInferenceParams(cfg, inference.SemanticOnly)
			runBatchMode(cfg, batchFile, difficulty, params)
		},
	}

	// Evaluation mode command
	evaluateCmd := &cobra.Command{
		Use:   "evaluate",
		Short: "Run evaluation mode",
		Long:  `Process queries and evaluate responses from all inference strategies.`,
		Run: func(cmd *cobra.Command, args []string) {
			if batchFile == "" {
				fmt.Println("Error: batch file path is required")
				os.Exit(1)
			}

			cfg, err := config.LoadConfig(configPath)
			if err != nil {
				fmt.Printf("Error loading config: %v\n", err)
				os.Exit(1)
			}
			runEvaluationMode(cfg, batchFile, difficulty)
		},
	}

	// Global flags
	rootCmd.PersistentFlags().StringVar(&configPath, "config", "config/config.example.yaml", "path to config file")

	// Batch command flags
	batchCmd.Flags().StringVarP(&batchFile, "file", "f", "", "path to batch query file (required)")
	batchCmd.Flags().StringVarP(&difficulty, "difficulty", "d", "", "filter queries by difficulty (easy, medium, hard)")
	batchCmd.MarkFlagRequired("file")

	// Evaluation command flags
	evaluateCmd.Flags().StringVarP(&batchFile, "file", "f", "", "path to batch query file (required)")
	evaluateCmd.Flags().StringVarP(&difficulty, "difficulty", "d", "", "filter queries by difficulty (easy, medium, hard)")
	evaluateCmd.MarkFlagRequired("file")

	// Add commands to root
	rootCmd.AddCommand(interactiveCmd, batchCmd, evaluateCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
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

func runEvaluationMode(cfg *config.Config, batchFile, difficulty string) {
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

	// Define all strategies
	strategies := []struct {
		name     string
		strategy inference.InferenceStrategy
	}{
		{"similarity", inference.SimilarityOnly},
		{"semantic", inference.SemanticOnly},
		{"hybrid", inference.Hybrid},
	}

	// Process each query
	for _, query := range queries {
		fmt.Printf("\nProcessing query %s: %s\n", query.ID, query.Question)

		// Run inference with each strategy
		var candidates []struct {
			StrategyName string `json:"strategy_name"`
			Answer      string `json:"answer"`
		}

		for _, s := range strategies {
			fmt.Printf("Running %s strategy...\n", s.name)
			params := inference.GetInferenceParams(cfg, s.strategy)
			params.Query = inference.Query{
				Question: query.Question,
			}

			response, err := engine.Infer(params)
			if err != nil {
				fmt.Printf("Error with %s strategy: %v\n", s.name, err)
				continue
			}

			candidates = append(candidates, struct {
				StrategyName string `json:"strategy_name"`
				Answer      string `json:"answer"`
			}{
				StrategyName: s.name,
				Answer:      response.Answer,
			})
		}

		// If we have candidates and an example answer, evaluate them
		if len(candidates) > 0 && query.ExampleCorrectAnswer != "" {
			evalParams := inference.EvaluationParams{
				Question:       query.Question,
				ExpectedAnswer: query.ExampleCorrectAnswer,
				Candidates:     candidates,
			}

			evalResponse, err := engine.Evaluate(evalParams)
			if err != nil {
				fmt.Printf("Error evaluating responses: %v\n", err)
				continue
			}

			// Write evaluation results
			result := struct {
				QueryID      string                   `json:"query_id"`
				Question     string                   `json:"question"`
				Evaluations  []inference.Evaluation   `json:"evaluations"`
				Candidates   []map[string]interface{} `json:"candidates"`
			}{
				QueryID:     query.ID,
				Question:    query.Question,
				Evaluations: evalResponse.Evaluations,
				Candidates:  make([]map[string]interface{}, len(candidates)),
			}

			// Format candidates with their answers
			for i, c := range candidates {
				result.Candidates[i] = map[string]interface{}{
					"strategy": c.StrategyName,
					"answer":   c.Answer,
				}
			}

			// Write result to file
			bytes, err := json.Marshal(result)
			if err != nil {
				fmt.Printf("Error marshaling result: %v\n", err)
				continue
			}

			if _, err := evalFile.Write(bytes); err != nil {
				fmt.Printf("Error writing result: %v\n", err)
				continue
			}
			if _, err := evalFile.WriteString("\n"); err != nil {
				fmt.Printf("Error writing newline: %v\n", err)
				continue
			}

			// Print evaluation summary
			fmt.Printf("\nEvaluation Results for query %s:\n", query.ID)
			for _, eval := range evalResponse.Evaluations {
				fmt.Printf("- %s: Score=%.2f, %s\n",
					eval.StrategyName,
					eval.Score,
					eval.Explanation)
			}
		}
	}

	fmt.Println("\nEvaluation complete. Results written to file.")
}