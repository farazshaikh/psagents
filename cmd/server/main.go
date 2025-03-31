package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/spf13/cobra"
	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/graphdb"
	"github.com/yourusername/psagents/internal/inference"
	"github.com/yourusername/psagents/internal/vector_db"
)

type Server struct {
	inferenceEngine *inference.Engine
	graphDB        *graphdb.GraphDB
	cfg            *config.Config
}

type ChatCompletionRequest struct {
	Prompt            string `json:"prompt"`
	InferenceStrategy string `json:"inferenceStrategy"`
}

var (
	configPath string
	webDir     string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "server",
		Short: "PSAgents API server",
		Long: `A REST API server for the PSAgents system that provides endpoints for:
- Chat completions with different inference strategies
- Message retrieval by ID
- Web interface for interactive chat`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runServer()
		},
	}

	// Global flags
	rootCmd.PersistentFlags().StringVar(&configPath, "config", "config/config.example.yaml", "path to config file")
	rootCmd.PersistentFlags().StringVar(&webDir, "web-dir", "cmd/server/web", "path to web files directory")

	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}

func runServer() error {
	// Load configuration
	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Create server
	server, err := NewServer(cfg)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
	}

	// Set up API routes with CORS
	http.HandleFunc("/api/v1/chat/completions", enableCORS(server.handleChatCompletions))
	http.HandleFunc("/api/v1/message/id", enableCORS(server.handleMessageById))

	// Serve static files
	fs := http.FileServer(http.Dir(webDir))
	http.Handle("/", fs)

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Starting server on %s", addr)
	log.Printf("Web interface available at http://localhost:%d", cfg.Server.Port)
	if err := http.ListenAndServe(addr, nil); err != nil {
		return fmt.Errorf("server error: %w", err)
	}

	return nil
}

func NewServer(cfg *config.Config) (*Server, error) {
	// Initialize vector database (needed for graphdb)
	vectorDB, err := vector_db.NewQdrantDB(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize vector DB: %w", err)
	}

	// Initialize graph database
	graphDB, err := graphdb.NewGraphDB(cfg, vectorDB)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize graph DB: %w", err)
	}

	// Initialize inference engine
	inferenceEngine, err := inference.NewEngine(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize inference engine: %w", err)
	}

	return &Server{
		inferenceEngine: inferenceEngine,
		graphDB:        graphDB,
		cfg:            cfg,
	}, nil
}

func enableCORS(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		handler(w, r)
	}
}

/* Implement inference strategy based on README.md */
func parseInferenceStrategy(cfg *config.Config, strategy string) (inference.InferenceParams, error) {
	switch strategy {
	case "similarity":
		return inference.GetInferenceParams(cfg, inference.SimilarityOnly), nil
	case "semantic":
		return inference.GetInferenceParams(cfg, inference.SemanticOnly), nil
	// default to hybrid
	//case "hybrid":
	default:
		return inference.GetInferenceParams(cfg, inference.Hybrid), nil
	}
}

func (s *Server) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatCompletionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	inferenceParams, err := parseInferenceStrategy(s.cfg, req.InferenceStrategy)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid inference strategy: %v", err), http.StatusBadRequest)
		return
	}

	inferenceParams.Query = inference.Query{
		Question: req.Prompt,
	}

	inferenceParams.SystemPrompt = s.cfg.LLM.InferenceSystemPrompt

	response, err := s.inferenceEngine.Infer(inferenceParams)

	if err != nil {
		log.Printf("Error processing chat completion: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleMessageById(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	messageID := r.URL.Query().Get("id")
	if messageID == "" {
		http.Error(w, "Missing message ID", http.StatusBadRequest)
		return
	}

	session := s.graphDB.GetSession()
	defer session.Close()

	message, err := s.graphDB.GetMessageByID(session, messageID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get message: %v", err), http.StatusInternalServerError)
		return
	}

	if message == nil {
		http.Error(w, "Message not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}