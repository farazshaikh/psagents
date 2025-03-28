package main

import (
	"context"
	"flag"
	"fmt"
	"log"

	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/embeddings"
	"github.com/yourusername/psagents/internal/graphdb"
	"github.com/yourusername/psagents/internal/vector"
	"github.com/yourusername/psagents/internal/vector_db"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "config/config.example.yaml", "path to config file")
	flag.Parse()

	// Load configuration
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Create embedding generator
	gen, err := embeddings.NewGenerator(cfg)
	if err != nil {
		log.Fatalf("Failed to create generator: %v", err)
	}

	// If dev mode, create development file first
	if cfg.DevMode.Enabled {
		if err := gen.CreateDevFile(); err != nil {
			log.Fatalf("Failed to create development file: %v", err)
		}
		fmt.Printf("Created development file with first %d messages\n", cfg.DevMode.MaxMessages)
	}

	// Generate embeddings
	if err := gen.GenerateEmbeddings(); err != nil {
		log.Fatalf("Failed to generate embeddings: %v", err)
	}

	// Initialize vector database
	fmt.Println("Initializing vector database...")
	var vectorDB vector.DB
	if cfg.Qdrant.Enabled {
		// Initialize Qdrant database
		qdrantDB, err := vector_db.NewQdrantDB(cfg)
		if err != nil {
			log.Fatalf("Failed to initialize vector database: %v", err)
		}
		defer qdrantDB.Close()

		// Create collection if it doesn't exist
		if err := qdrantDB.(vector_db.DB).CreateCollection(); err != nil {
			log.Fatalf("Failed to create collection: %v", err)
		}

		// Inject messages into the database
		if err := qdrantDB.(vector_db.DB).InjectMessages(); err != nil {
			log.Fatalf("Failed to inject messages into vector database: %v", err)
		}

		fmt.Println("Successfully initialized vector database")
		vectorDB = qdrantDB
	} else {
		log.Fatal("No vector database enabled in configuration")
	}

	// Initialize graph database
	fmt.Println("Initializing graph database...")
	graphDB, err := graphdb.NewGraphDB(cfg, vectorDB)
	if err != nil {
		log.Fatalf("Failed to initialize graph database: %v", err)
	}
	defer graphDB.Close()

	// Perform first pass to build similarity anchor edges
	fmt.Println("Performing first pass to build similarity anchor edges...")
	if err := graphDB.FirstPass(context.Background()); err != nil {
		log.Fatalf("Failed to perform first pass: %v", err)
	}
	fmt.Println("Successfully completed first pass")

	// Perform second pass to build semantic frontier edges
	fmt.Println("Performing second pass to build semantic frontier edges...")
	if err := graphDB.SecondPass(context.Background()); err != nil {
		log.Fatalf("Failed to perform second pass: %v", err)
	}
	fmt.Println("Successfully completed second pass")

	fmt.Println("Successfully generated embeddings and initialized knowledge graph")
}