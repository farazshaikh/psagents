package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/embeddings"
	"github.com/yourusername/psagents/internal/vector_db"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "config/config.example.yaml", "path to config file")


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
		fmt.Println("Created development file with first 20 messages")
	}

	// Generate embeddings
	if err := gen.GenerateEmbeddings(); err != nil {
		log.Fatalf("Failed to generate embeddings: %v", err)
	}
	// Insert embeddings into Qdrant database
	if cfg.Qdrant.Enabled {
		fmt.Println("Inserting embeddings into Qdrant database...")

		// Initialize vector database
		db, err := vector_db.NewQdrantDB(cfg)
		if err != nil {
			log.Fatalf("Failed to initialize vector database: %v", err)
		}
		defer db.Close()

		// Create collection if it doesn't exist
		if err := db.CreateCollection(); err != nil {
			log.Fatalf("Failed to create collection: %v", err)
		}

		// Inject messages into the database
		if err := db.InjectMessages(); err != nil {
			log.Fatalf("Failed to inject messages into vector database: %v", err)
		}

		fmt.Println("Successfully inserted embeddings into Qdrant database")
	}

	fmt.Println("Successfully generated embeddings")
}