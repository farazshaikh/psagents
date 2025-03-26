package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/embeddings"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "config/config.example.yaml", "path to config file")
	devMode := flag.Bool("dev", false, "use development file (first 20 messages)")
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
	if *devMode {
		if err := gen.CreateDevFile(); err != nil {
			log.Fatalf("Failed to create development file: %v", err)
		}
		fmt.Println("Created development file with first 20 messages")
	}

	// Generate embeddings
	if err := gen.GenerateEmbeddings(); err != nil {
		log.Fatalf("Failed to generate embeddings: %v", err)
	}

	fmt.Println("Successfully generated embeddings")
}