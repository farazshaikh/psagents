package main

import (
	"context"
	"fmt"
	"log"

	"github.com/spf13/cobra"
	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/embeddings"
	"github.com/yourusername/psagents/internal/graphdb"
	"github.com/yourusername/psagents/internal/llm"
	"github.com/yourusername/psagents/internal/vector"
	"github.com/yourusername/psagents/internal/vector_db"
)

// Phase represents an ingestion phase
type Phase struct {
	Name     string
	Enabled  bool
	Handler  func(context.Context) error
}

var (
	configPath string
	phases     []string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "ingest",
		Short: "PSAgents data ingestion tool",
		Long: `A command line tool for ingesting and processing data for the PSAgents system.
It handles embedding generation, vector database population, and graph construction.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runIngest(cmd.Context())
		},
	}

	// Global flags
	rootCmd.PersistentFlags().StringVar(&configPath, "config", "config/config.example.yaml", "path to config file")
	rootCmd.Flags().StringSliceVar(&phases, "phases", nil, "specific phases to run (comma-separated). If not specified, runs all enabled phases")

	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}

func runIngest(ctx context.Context) error {
	// Load configuration
	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Initialize components
	var gen *embeddings.Generator
	var vectorDB vector.DB
	var graphDB *graphdb.GraphDB
	var llmClient llm.LLM

	// Define all available phases
	allPhases := []Phase{
		{
			Name:    "embedding",
			Enabled: isPhaseEnabled(cfg.Ingestion.Stages, "embedding"),
			Handler: func(ctx context.Context) error {
				var err error
				// Create embedding generator
				gen, err = embeddings.NewGenerator(cfg)
				if err != nil {
					return fmt.Errorf("failed to create generator: %w", err)
				}

				// If dev mode, create development file first
				if cfg.DevMode.Enabled {
					if err := gen.CreateDevFile(); err != nil {
						return fmt.Errorf("failed to create development file: %w", err)
					}
					fmt.Printf("Created development file with first %d messages\n", cfg.DevMode.MaxMessages)
				}

				// Generate embeddings
				if err := gen.GenerateEmbeddings(); err != nil {
					return fmt.Errorf("failed to generate embeddings: %w", err)
				}
				return nil
			},
		},
		{
			Name:    "semantic_search",
			Enabled: isPhaseEnabled(cfg.Ingestion.Stages, "semantic_search"),
			Handler: func(ctx context.Context) error {
				fmt.Println("Initializing vector database...")
				if cfg.Qdrant.Enabled {
					// Initialize Qdrant database
					qdrantDB, err := vector_db.NewQdrantDB(cfg)
					if err != nil {
						return fmt.Errorf("failed to initialize vector database: %w", err)
					}

					// Create collection if it doesn't exist
					if err := qdrantDB.(vector_db.DB).CreateCollection(); err != nil {
						return fmt.Errorf("failed to create collection: %w", err)
					}

					// Inject messages into the database
					if err := qdrantDB.(vector_db.DB).InjectMessages(); err != nil {
						return fmt.Errorf("failed to inject messages into vector database: %w", err)
					}

					fmt.Println("Successfully initialized vector database")
					vectorDB = qdrantDB
				} else {
					return fmt.Errorf("no vector database enabled in configuration")
				}
				return nil
			},
		},
		{
			Name:    "graph_construction",
			Enabled: isPhaseEnabled(cfg.Ingestion.Stages, "graph_construction"),
			Handler: func(ctx context.Context) error {
				fmt.Println("Initializing graph database...")
				var err error
				graphDB, err = graphdb.NewGraphDB(cfg, vectorDB)
				if err != nil {
					return fmt.Errorf("failed to initialize graph database: %w", err)
				}
				return nil
			},
		},
		{
			Name:    "graph_construction_pass_1",
			Enabled: isPhaseEnabled(cfg.Ingestion.Stages, "graph_construction_pass_1"),
			Handler: func(ctx context.Context) error {
				if graphDB == nil {
					return fmt.Errorf("graph database not initialized")
				}
				fmt.Println("Performing first pass to build similarity anchor edges...")
				if err := graphDB.FirstPass(ctx); err != nil {
					return fmt.Errorf("failed to perform first pass: %w", err)
				}
				fmt.Println("Successfully completed first pass")
				return nil
			},
		},
		{
			Name:    "graph_construction_pass_2",
			Enabled: isPhaseEnabled(cfg.Ingestion.Stages, "graph_construction_pass_2"),
			Handler: func(ctx context.Context) error {
				if graphDB == nil {
					return fmt.Errorf("graph database not initialized")
				}
				// Initialize LLM if not already done
				if llmClient == nil {
					var err error
					llmClient, err = llm.NewLLM(cfg)
					if err != nil {
						return fmt.Errorf("failed to initialize LLM: %w", err)
					}
				}
				fmt.Println("Performing second pass to build semantic frontier edges...")
				if err := graphDB.SecondPass(ctx, llmClient); err != nil {
					return fmt.Errorf("failed to perform second pass: %w", err)
				}
				fmt.Println("Successfully completed second pass")
				return nil
			},
		},
	}

	// Filter phases if specific ones were requested
	var phasesToRun []Phase
	if len(phases) > 0 {
		phaseMap := make(map[string]bool)
		for _, p := range phases {
			phaseMap[p] = true
		}
		for _, phase := range allPhases {
			if phaseMap[phase.Name] {
				phase.Enabled = true
				phasesToRun = append(phasesToRun, phase)
			}
		}
	} else {
		phasesToRun = allPhases
	}

	// Execute enabled phases in order
	for _, phase := range phasesToRun {
		if phase.Enabled {
			fmt.Printf("Executing phase: %s\n", phase.Name)
			if err := phase.Handler(ctx); err != nil {
				return fmt.Errorf("failed to execute phase %s: %w", phase.Name, err)
			}
		} else {
			fmt.Printf("Skipping disabled phase: %s\n", phase.Name)
		}
	}

	// Cleanup
	if vectorDB != nil {
		if closer, ok := vectorDB.(interface{ Close() error }); ok {
			closer.Close()
		}
	}
	if graphDB != nil {
		graphDB.Close()
	}

	fmt.Println("Successfully completed all enabled phases")
	return nil
}

// isPhaseEnabled checks if a phase is enabled in the config
func isPhaseEnabled(stages []map[string]interface{}, phaseName string) bool {
	for _, stage := range stages {
		for name, enabled := range stage {
			if name == phaseName {
				switch v := enabled.(type) {
				case bool:
					return v
				case string:
					return v != "false" && v != "0" && v != ""
				default:
					return true // If value is not bool or string, assume enabled
				}
			}
		}
	}
	return false // Phase not found in config
}